import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";
import { computeClientMetrics, periodTotals, percentChange } from "@/lib/reportMetrics";

// GET /api/stats/report?period=month&value=YYYY-MM
// GET /api/stats/report?period=year&value=YYYY
// Staff only. Unlike /api/stats (trailing windows), this is bound to an
// exact calendar period — what a report needs, since "August 2026" has
// to mean exactly August 2026, not "the last 30 days from whenever this
// was run." "Previous period" here means the previous calendar month or
// calendar year, matching that same logic.

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

export async function GET(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") === "year" ? "year" : "month";
    const value = searchParams.get("value");
    if (!value) {
      return NextResponse.json({ error: "Missing period value." }, { status: 400 });
    }

    const { start, end, label } = periodBounds(period, value);
    const prevValue = previousPeriodValue(period, value);
    const { start: prevStart, end: prevEnd } = periodBounds(period, prevValue);

    // Fetch ALL completed bookings, unbounded — client metrics ("was this
    // their first ever visit") need full history, not just this period.
    const allBookings = await prisma.booking.findMany({
      where: { status: "completed" },
      include: { location: true, items: { include: { service: true } } },
      orderBy: { date: "asc" },
    });

    const bookings = allBookings.filter((b) => b.date >= start && b.date <= end);

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const completedCount = bookings.length;
    const avgPerBooking = completedCount ? totalRevenue / completedCount : 0;

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

    // Sub-period breakdown: daily rows for a month, monthly rows for a year
    const subMap = new Map();
    for (const b of bookings) {
      const key = period === "year" ? b.date.slice(0, 7) : b.date;
      subMap.set(key, (subMap.get(key) || 0) + b.totalPrice);
    }
    const subPeriods = Array.from(subMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, revenue]) => ({
        label:
          period === "year"
            ? new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: "long" })
            : new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        revenue,
      }));

    const transactions = bookings.map((b) => ({
      date: b.date,
      customerName: b.customerName,
      location: b.location.name,
      services: b.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", "),
      amount: b.totalPrice,
    }));

    // Performance vs the previous calendar month/year
    const current = periodTotals(allBookings, start, end);
    const previous = periodTotals(allBookings, prevStart, prevEnd);
    const comparison = {
      previousLabel: period === "year" ? "previous year" : "previous month",
      revenueChange: percentChange(current.revenue, previous.revenue),
      appointmentsChange: percentChange(current.count, previous.count),
      avgTransactionChange: percentChange(current.avg, previous.avg),
    };

    const clientMetrics = computeClientMetrics({
      bookings: allBookings,
      periodStart: start,
      periodEnd: end,
      prevStart,
      prevEnd,
    });

    return NextResponse.json({
      period,
      label,
      totalRevenue,
      completedCount,
      avgPerBooking,
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
