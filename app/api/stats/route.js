import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";
import { computeClientMetrics, periodTotals, percentChange } from "@/lib/reportMetrics";
import { getTorontoNow } from "@/lib/torontoTime";

// GET /api/stats?range=week|month|year|all — staff only.
// Scoped to COMPLETED bookings only — that's the only status that
// represents work actually done and revenue actually earned.
// Ranges are trailing windows (last 7/30/365 days), not calendar-aligned.

function pad(n) {
  return n.toString().padStart(2, "0");
}
function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function monthLabel(d) {
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}
function dayLabel(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const WINDOW_DAYS = { week: 7, month: 30, year: 365 };

// The income fields Ralf can plot / total. Service income is split by how it
// was paid; tips are entered per day and are kept separate from service income.
// "serviceUnspecified" = completed before payment methods were recorded.
const FIELD_KEYS = ["serviceCash", "serviceEtransfer", "serviceUnspecified", "tipsCash", "tipsEtransfer"];
const emptyFields = () => Object.fromEntries(FIELD_KEYS.map((k) => [k, 0]));
function serviceFieldOf(b) {
  return b.paymentMethod === "cash" ? "serviceCash" : b.paymentMethod === "etransfer" ? "serviceEtransfer" : "serviceUnspecified";
}

export async function GET(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "month";
    // "Today" in Toronto (the server runs in UTC, which flips to tomorrow in the evening)
    const [ty, tm, td] = getTorontoNow().date.split("-").map(Number);
    const today = new Date(ty, tm - 1, td);
    const todayStr = toDateStr(today);

    let cutoffStr = null;
    if (range in WINDOW_DAYS) cutoffStr = toDateStr(addDays(today, -(WINDOW_DAYS[range] - 1)));
    // "all" leaves cutoffStr as null — no lower bound

    // Fetch ALL completed bookings, unbounded — client metrics ("was this
    // their first ever visit") need full history, not just this window.
    const allBookings = await prisma.booking.findMany({
      where: { status: "completed" },
      include: { location: true, items: { include: { service: true } } },
      orderBy: { date: "asc" },
    });

    const bookings = cutoffStr ? allBookings.filter((b) => b.date >= cutoffStr) : allBookings;

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const completedCount = bookings.length;
    const avgPerBooking = completedCount ? totalRevenue / completedCount : 0;

    // Breakdown by service (revenue = unitPrice * quantity, summed)
    const serviceMap = new Map();
    for (const b of bookings) {
      for (const item of b.items) {
        const key = item.service.name;
        const entry = serviceMap.get(key) || { name: key, revenue: 0, count: 0 };
        entry.revenue += item.unitPrice * item.quantity;
        entry.count += item.quantity;
        serviceMap.set(key, entry);
      }
    }
    const byService = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Breakdown by location
    const locationMap = new Map();
    for (const b of bookings) {
      const key = b.location.name;
      const entry = locationMap.get(key) || { name: key, revenue: 0, count: 0 };
      entry.revenue += b.totalPrice;
      entry.count += 1;
      locationMap.set(key, entry);
    }
    const byLocation = Array.from(locationMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Tips entered by hand per day (cash / e-transfer), within the same window
    const dayTips = await prisma.dayTips.findMany({ where: cutoffStr ? { date: { gte: cutoffStr } } : {} });

    // Time series — daily buckets for week/month, monthly buckets for year/all
    const daily = range === "week" || range === "month";
    const buckets = []; // [{ key, label }]
    if (daily) {
      for (let i = WINDOW_DAYS[range] - 1; i >= 0; i--) {
        const d = addDays(today, -i);
        buckets.push({ key: toDateStr(d), label: dayLabel(d) });
      }
    } else {
      let monthCursor;
      if (range === "year") {
        monthCursor = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      } else {
        const dates = [bookings[0]?.date, dayTips[0]?.date].filter(Boolean).concat(dayTips.map((t) => t.date));
        const earliest = dates.sort()[0];
        monthCursor = earliest
          ? new Date(Number(earliest.slice(0, 4)), Number(earliest.slice(5, 7)) - 1, 1)
          : new Date(today.getFullYear(), today.getMonth(), 1);
      }
      const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      while (monthCursor <= endMonth) {
        buckets.push({
          key: `${monthCursor.getFullYear()}-${pad(monthCursor.getMonth() + 1)}`,
          label: monthLabel(monthCursor),
        });
        monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
      }
    }
    const bucketOf = (date) => (daily ? date : date.slice(0, 7));
    const agg = new Map(buckets.map((b) => [b.key, emptyFields()]));
    const totals = emptyFields();
    for (const b of bookings) {
      const f = serviceFieldOf(b);
      totals[f] += b.totalPrice;
      const a = agg.get(bucketOf(b.date));
      if (a) a[f] += b.totalPrice;
    }
    for (const t of dayTips) {
      totals.tipsCash += t.cashTips;
      totals.tipsEtransfer += t.etransferTips;
      const a = agg.get(bucketOf(t.date));
      if (a) {
        a.tipsCash += t.cashTips;
        a.tipsEtransfer += t.etransferTips;
      }
    }
    // The original "service revenue" line (all service income, however it was paid)
    const series = buckets.map((b) => {
      const a = agg.get(b.key);
      return { label: b.label, value: a.serviceCash + a.serviceEtransfer + a.serviceUnspecified };
    });
    // One series per income field, for the multi-line chart
    const seriesByField = Object.fromEntries(
      FIELD_KEYS.map((k) => [k, buckets.map((b) => ({ label: b.label, value: agg.get(b.key)[k] }))])
    );

    // Previous period (same length, immediately before this one) — powers
    // both the % change summary and client retention. "all" has no
    // previous period by definition, so this stays null in that case.
    let comparison = null;
    let prevStart = null;
    let prevEnd = null;
    if (cutoffStr) {
      const windowDays = WINDOW_DAYS[range];
      const prevEndDate = addDays(new Date(cutoffStr + "T00:00:00"), -1);
      const prevStartDate = addDays(prevEndDate, -(windowDays - 1));
      prevStart = toDateStr(prevStartDate);
      prevEnd = toDateStr(prevEndDate);

      const current = periodTotals(allBookings, cutoffStr, todayStr);
      const previous = periodTotals(allBookings, prevStart, prevEnd);
      comparison = {
        previousLabel: range === "week" ? "previous week" : range === "month" ? "previous month" : "previous year",
        revenueChange: percentChange(current.revenue, previous.revenue),
        appointmentsChange: percentChange(current.count, previous.count),
        avgTransactionChange: percentChange(current.avg, previous.avg),
      };
    }

    const clientMetrics = computeClientMetrics({
      bookings: allBookings,
      periodStart: cutoffStr || (allBookings[0]?.date ?? todayStr),
      periodEnd: todayStr,
      prevStart,
      prevEnd,
    });

    return NextResponse.json({
      totalRevenue,
      completedCount,
      avgPerBooking,
      byService,
      byLocation,
      series,
      seriesByField,
      totals,
      comparison,
      clientMetrics,
    });
  } catch (err) {
    console.error("GET /api/stats failed:", err);
    return NextResponse.json({ error: "Could not load stats. Check the server logs." }, { status: 500 });
  }
}
