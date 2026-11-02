import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";
import { computeClientMetrics, periodTotals, percentChange } from "@/lib/reportMetrics";

// GET /api/stats/report?period=month&value=YYYY-MM[&fields=serviceCash,tipsCash,...]
// GET /api/stats/report?period=year&value=YYYY
// Staff only. Bound to an exact calendar period.
// `fields` picks which income to include: service income by payment method
// (serviceCash / serviceEtransfer / serviceUnspecified) and tips
// (tipsCash / tipsEtransfer). Tips are always reported as their own line,
// never mixed into service revenue. No `fields` = everything.

const SERVICE_FIELDS = ["serviceCash", "serviceEtransfer", "serviceUnspecified"];
const TIP_FIELDS = ["tipsCash", "tipsEtransfer"];
const ALL_FIELDS = [...SERVICE_FIELDS, ...TIP_FIELDS];

function pad(n) {
  return n.toString().padStart(2, "0");
}

function periodBounds(period, value) {
  if (period === "year") {
    const year = Number(value);
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: String(year) };
  }
  const [year, month] = value.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const label = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return { start: `${value}-01`, end: `${value}-${pad(lastDay)}`, label };
}

function previousPeriodValue(period, value) {
  if (period === "year") return String(Number(value) - 1);
  const [year, month] = value.split("-").map(Number);
  const py = month === 1 ? year - 1 : year;
  const pm = month === 1 ? 12 : month - 1;
  return `${py}-${pad(pm)}`;
}

function serviceFieldOf(b) {
  return b.paymentMethod === "cash" ? "serviceCash" : b.paymentMethod === "etransfer" ? "serviceEtransfer" : "serviceUnspecified";
}
const METHOD_LABEL = { cash: "Cash", etransfer: "E-transfer" };

export async function GET(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") === "year" ? "year" : "month";
    const value = searchParams.get("value");
    if (!value || !(period === "year" ? /^\d{4}$/ : /^\d{4}-\d{2}$/).test(value)) {
      return NextResponse.json({ error: "Missing or invalid period value." }, { status: 400 });
    }

    const rawFields = searchParams.get("fields");
    const fields = rawFields === null ? ALL_FIELDS : rawFields.split(",").filter((f) => ALL_FIELDS.includes(f));
    const includeSet = new Set(fields);
    const serviceSelected = SERVICE_FIELDS.filter((f) => includeSet.has(f));
    const tipsSelected = TIP_FIELDS.filter((f) => includeSet.has(f));

    const { start, end, label } = periodBounds(period, value);
    const prevValue = previousPeriodValue(period, value);
    const { start: prevStart, end: prevEnd } = periodBounds(period, prevValue);

    // ALL completed bookings — client metrics need full history
    const everyBooking = await prisma.booking.findMany({
      where: { status: "completed" },
      include: { location: true, items: { include: { service: true } } },
      orderBy: { date: "asc" },
    });
    // Only the selected payment methods count toward revenue figures
    const allBookings = everyBooking.filter((b) => includeSet.has(serviceFieldOf(b)));
    const bookings = allBookings.filter((b) => b.date >= start && b.date <= end);

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const completedCount = bookings.length;
    const avgPerBooking = completedCount ? totalRevenue / completedCount : 0;

    // Service income by payment method (selected ones only)
    const serviceByMethod = Object.fromEntries(serviceSelected.map((k) => [k, 0]));
    for (const b of bookings) serviceByMethod[serviceFieldOf(b)] += b.totalPrice;

    const serviceMap = new Map();
    for (const b of bookings) {
      for (const item of b.items) {
        const entry = serviceMap.get(item.service.name) || { name: item.service.name, revenue: 0, count: 0 };
        entry.revenue += item.unitPrice * item.quantity;
        entry.count += item.quantity;
        serviceMap.set(item.service.name, entry);
      }
    }
    const byService = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);

    const locationMap = new Map();
    for (const b of bookings) {
      const entry = locationMap.get(b.location.name) || { name: b.location.name, revenue: 0, count: 0 };
      entry.revenue += b.totalPrice;
      entry.count += 1;
      locationMap.set(b.location.name, entry);
    }
    const byLocation = Array.from(locationMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Tips for the period (separate from service income)
    const dayTips = tipsSelected.length
      ? await prisma.dayTips.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: "asc" } })
      : [];
    const tipsOf = (t) => (includeSet.has("tipsCash") ? t.cashTips : 0) + (includeSet.has("tipsEtransfer") ? t.etransferTips : 0);
    const tips = {
      selected: tipsSelected.length > 0,
      cash: includeSet.has("tipsCash") ? dayTips.reduce((s, t) => s + t.cashTips, 0) : null,
      etransfer: includeSet.has("tipsEtransfer") ? dayTips.reduce((s, t) => s + t.etransferTips, 0) : null,
    };
    tips.total = (tips.cash || 0) + (tips.etransfer || 0);

    // Sub-period breakdown: daily rows for a month, monthly rows for a year (services and tips side by side)
    const subMap = new Map();
    const bump = (date, k, amt) => {
      const key = period === "year" ? date.slice(0, 7) : date;
      const row = subMap.get(key) || { revenue: 0, tips: 0 };
      row[k] += amt;
      subMap.set(key, row);
    };
    for (const b of bookings) bump(b.date, "revenue", b.totalPrice);
    for (const t of dayTips) if (tipsOf(t) > 0) bump(t.date, "tips", tipsOf(t));
    const subPeriods = Array.from(subMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, row]) => ({
        label:
          period === "year"
            ? new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: "long" })
            : new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        revenue: row.revenue,
        tips: row.tips,
      }));

    const transactions = bookings.map((b) => ({
      date: b.date,
      customerName: b.customerName,
      location: b.location.name,
      services: b.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", "),
      paymentMethod: METHOD_LABEL[b.paymentMethod] || "Unspecified",
      amount: b.totalPrice,
    }));

    // Performance vs the previous calendar month/year (selected income only)
    const current = periodTotals(allBookings, start, end);
    const previous = periodTotals(allBookings, prevStart, prevEnd);
    const comparison = {
      previousLabel: period === "year" ? "previous year" : "previous month",
      revenueChange: percentChange(current.revenue, previous.revenue),
      appointmentsChange: percentChange(current.count, previous.count),
      avgTransactionChange: percentChange(current.avg, previous.avg),
    };

    const clientMetrics = computeClientMetrics({
      bookings: everyBooking,
      periodStart: start,
      periodEnd: end,
      prevStart,
      prevEnd,
    });

    return NextResponse.json({
      period,
      label,
      fields,
      totalRevenue,
      completedCount,
      avgPerBooking,
      serviceByMethod,
      tips,
      grandTotal: totalRevenue + tips.total,
      byService,
      byLocation,
      subPeriods,
      transactions,
      comparison,
      clientMetrics,
    });
  } catch (err) {
    console.error("GET /api/stats/report failed:", err);
    return NextResponse.json({ error: "Could not generate the report. Check the server logs." }, { status: 500 });
  }
}
