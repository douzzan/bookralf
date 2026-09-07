// The bulk-haircut discount: Haircut, Child, and Haircut+Beard (marked
// isBulkHaircut on the Service) share a time bucket when several are
// booked together, since there's no travel time between services in the
// same visit. Everything else (Ceremonial Haircut, and anything future)
// always uses its own full duration, added on top of the bucket.
//
// The bucket table itself (3=60min, 4-5=90min, etc.) lives in the
// database now — editable from the staff Edit Services page — not
// hardcoded here. Counts of 1-2 always use the actual sum of the chosen
// items' own durations; that part isn't a bracket, it's just what "no
// discount yet" means.

function bulkBucketMinutes(bucketItems, brackets) {
  const count = bucketItems.reduce((sum, i) => sum + i.quantity, 0);
  if (count === 0) return 0;
  if (count <= 2) return bucketItems.reduce((sum, i) => sum + i.durationMin * i.quantity, 0);

  const bracket = (brackets || []).find((b) => count >= b.minCount && count <= b.maxCount);
  if (bracket) return bracket.flatMinutes;

  // Safety net: if the count falls outside every configured bracket
  // (e.g. brackets were edited and no longer cover this range), fall
  // back to the actual sum rather than under/over-booking silently.
  return bucketItems.reduce((sum, i) => sum + i.durationMin * i.quantity, 0);
}

// items: [{ serviceId, quantity }]
// services: full service records (must include id, durationMin, isBulkHaircut)
// brackets: the BulkHaircutBracket rows, in any order
export function computeTotalDuration(items, services, brackets) {
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

  return bulkBucketMinutes(bucketItems, brackets) + otherMinutes;
}

// The overall per-booking service cap is derived from the brackets
// themselves (the highest maxCount configured), so it can never drift
// out of sync with what the bucket table actually supports. Falls back
// to a sane default if brackets haven't loaded yet or are empty.
export function getMaxTotalQty(brackets) {
  if (!brackets || brackets.length === 0) return 10;
  return Math.max(...brackets.map((b) => b.maxCount));
}
