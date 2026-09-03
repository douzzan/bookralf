// Shared by /api/stats (trailing windows) and /api/stats/report (exact
// calendar periods) — both need "new vs returning clients," "retention
// vs the previous period," and "% change vs the previous period." Kept
// in one place so the definition can't drift between the two.

// bookings: every COMPLETED booking, unbounded by date — the "was this
// their first ever visit" check needs full history, not just the
// current window.
export function computeClientMetrics({ bookings, periodStart, periodEnd, prevStart, prevEnd }) {
  const inPeriod = bookings.filter((b) => b.date >= periodStart && b.date <= periodEnd);
  const clientsInPeriod = new Set(inPeriod.map((b) => b.phone));

  let newClients = 0;
  let returningClients = 0;
  for (const phone of clientsInPeriod) {
    const hadEarlierVisit = bookings.some((b) => b.phone === phone && b.date < periodStart);
    if (hadEarlierVisit) returningClients += 1;
    else newClients += 1;
  }

  const avgBookingsPerClient = clientsInPeriod.size ? inPeriod.length / clientsInPeriod.size : 0;

  let retentionRate = null; // null = not enough data to measure (no clients last period)
  if (prevStart && prevEnd) {
    const inPrevPeriod = bookings.filter((b) => b.date >= prevStart && b.date <= prevEnd);
    const clientsInPrevPeriod = new Set(inPrevPeriod.map((b) => b.phone));
    if (clientsInPrevPeriod.size > 0) {
      let retained = 0;
      for (const phone of clientsInPrevPeriod) {
        if (clientsInPeriod.has(phone)) retained += 1;
      }
      retentionRate = (retained / clientsInPrevPeriod.size) * 100;
    }
  }

  return {
    totalClients: clientsInPeriod.size,
    newClients,
    returningClients,
    avgBookingsPerClient,
    retentionRate,
  };
}

export function periodTotals(bookings, start, end) {
  const inRange = bookings.filter((b) => b.date >= start && b.date <= end);
  const revenue = inRange.reduce((sum, b) => sum + b.totalPrice, 0);
  const count = inRange.length;
  const avg = count ? revenue / count : 0;
  return { revenue, count, avg };
}

// null = can't compute a meaningful % (no data last period to compare against)
export function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
