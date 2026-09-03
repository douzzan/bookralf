import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";
import { computeClientMetrics, periodTotals, percentChange } from "@/lib/reportMetrics";

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

export async function GET(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "month";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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

    // Time series — daily buckets for week/month, monthly buckets for year/all
    let series = [];
    if (range === "week" || range === "month") {
      const numDays = WINDOW_DAYS[range];
      const dayTotals = new Map();
      for (const b of bookings) {
        dayTotals.set(b.date, (dayTotals.get(b.date) || 0) + b.totalPrice);
      }
      for (let i = numDays - 1; i >= 0; i--) {
        const d = addDays(today, -i);
        const dStr = toDateStr(d);
        series.push({ label: dayLabel(d), value: dayTotals.get(dStr) || 0 });
      }
    } else {
      // year / all — monthly buckets
      const monthTotals = new Map();
      for (const b of bookings) {
        const monthKey = b.date.slice(0, 7); // "YYYY-MM"
        monthTotals.set(monthKey, (monthTotals.get(monthKey) || 0) + b.totalPrice);
      }
      let monthCursor;
      if (range === "year") {
        monthCursor = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      } else {
        const earliest = bookings[0]?.date;
        monthCursor = earliest
          ? new Date(Number(earliest.slice(0, 4)), Number(earliest.slice(5, 7)) - 1, 1)
          : new Date(today.getFullYear(), today.getMonth(), 1);
      }
      const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      while (monthCursor <= endMonth) {
        const key = `${monthCursor.getFullYear()}-${pad(monthCursor.getMonth() + 1)}`;
        series.push({ label: monthLabel(monthCursor), value: monthTotals.get(key) || 0 });
        monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
      }
    }

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
      comparison,
      clientMetrics,
    });
  } catch (err) {
    console.error("GET /api/stats failed:", err);
    return NextResponse.json({ error: "Could not load stats. Check the server logs." }, { status: 500 });
  }
}
