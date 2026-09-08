// Core scheduling math. The customer-facing grid is always anchored to
// fixed :00/:30 marks — that part never moves, so the schedule stays
// readable no matter what gets booked. Actual reserved time per booking
// is exact minutes, not padded to the nearest 30 — that's what makes a
// gap (and the extra slot option below) possible in the first place.

export const SLOT_MIN = 30;

// Only offer a booking's true end-time as an extra start option if
// skipping it would waste at least this many minutes before the next
// standard grid mark. Keeps near-duplicate options (like 10:20 sitting
// right next to 10:30) from cluttering the list for no real benefit.
export const MIN_WASTED_MINUTES_TO_OFFER = 15;

export function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

// Purely informational — "about how many 30-min slots does this span" —
// used for display copy like "needs 2 slots". Never used to compute an
// actual reserved end time anymore; that uses exact minutes directly.
export function slotsNeeded(totalDurationMin) {
  return Math.ceil(totalDurationMin / SLOT_MIN);
}

function nextStandardMark(minutes, dayStart) {
  const sinceStart = minutes - dayStart;
  const roundedUp = Math.ceil(sinceStart / SLOT_MIN) * SLOT_MIN;
  return dayStart + roundedUp;
}

// Given a schedule day's working window and the bookings already placed
// on it, return every valid start time (as "HH:MM") that fits
// `durationMin` of exact time before closing, without overlapping
// anything already booked.
//
// existingBookings: array of { startTime, endTime } — endTime here is
// each booking's TRUE end time (exact minutes), not padded.
export function getAvailableStartTimes(scheduleDay, existingBookings, durationMin) {
  const dayStart = timeToMinutes(scheduleDay.startTime);
  const dayEnd = timeToMinutes(scheduleDay.endTime);

  const busyRanges = existingBookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  function fits(start) {
    const end = start + durationMin;
    if (end > dayEnd) return false;
    return !busyRanges.some((r) => start < r.end && end > r.start);
  }

  const results = [];

  // The standard grid — fixed at :00/:30 all day, unaffected by
  // whatever's already booked.
  for (let start = dayStart; start <= dayEnd - durationMin; start += SLOT_MIN) {
    if (fits(start)) results.push(start);
  }

  // Extras — one per existing booking, at its exact true end time, but
  // only if it's not already on a standard mark and skipping it would
  // waste enough time to be worth offering.
  for (const range of busyRanges) {
    if ((range.end - dayStart) % SLOT_MIN === 0) continue; // already standard-aligned
    const nextMark = nextStandardMark(range.end, dayStart);
    const wasted = nextMark - range.end;
    if (wasted < MIN_WASTED_MINUTES_TO_OFFER) continue;
    if (results.includes(range.end)) continue;
    if (fits(range.end)) results.push(range.end);
  }

  return results.sort((a, b) => a - b).map(minutesToTime);
}
