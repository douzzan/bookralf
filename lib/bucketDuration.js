// The bulk-haircut discount: Haircut, Child, and Haircut+Beard (marked
// isBulkHaircut on the Service) share a time bucket when several are
// booked together, since there's no travel time between services in the
// same visit. Everything else (Ceremonial Haircut, and anything future)
// always uses its own full duration, added on top of the bucket.
//
// count 1-2: sum of the actual items' own durations (no discount yet)
// count 3:   60 min flat
// count 4-5: 90 min flat
// count 6-8: 120 min flat
// count 9-10: 150 min flat
function bulkBucketMinutes(bucketItems) {
  const count = bucketItems.reduce((sum, i) => sum + i.quantity, 0);
  if (count === 0) return 0;
  if (count <= 2) return bucketItems.reduce((sum, i) => sum + i.durationMin * i.quantity, 0);
  if (count === 3) return 60;
  if (count <= 5) return 90;
  if (count <= 8) return 120;
  return 150; // 9-10, the hard maximum
}

// items: [{ serviceId, quantity }]
// services: full service records (must include id, durationMin, isBulkHaircut)
// Returns total minutes for the whole booking — bucket-discounted
// portion plus every non-bucket service at its own full duration.
export function computeTotalDuration(items, services) {
  const bucketItems = [];
  let otherMinutes = 0;

  for (const item of items) {
    const svc = services.find((s) => s.id === item.serviceId);
    if (!svc) continue;
    const qty = Math.max(1, Number(item.quantity) || 1);
    if (svc.isBulkHaircut) {
      bucketItems.push({ durationMin: svc.durationMin, quantity: qty });
    } else {
      otherMinutes += svc.durationMin * qty;
    }
  }

  return bulkBucketMinutes(bucketItems) + otherMinutes;
}

export const MAX_TOTAL_SERVICE_QTY = 10;
