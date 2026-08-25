// Core scheduling math: everything works in 30-minute slots.

export const SLOT_MIN = 30;

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

// How many 30-minute slots does a given total duration need?
export function slotsNeeded(totalDurationMin) {
  return Math.ceil(totalDurationMin / SLOT_MIN);
}

// Given a schedule day's working window and the bookings already
// placed on it, return every valid start time (as "HH:MM") that has
// `neededSlots` consecutive free slots before closing.
// existingBookings: array of { startTime, endTime } for bookings with
// status pending or confirmed on this schedule day.
export function getAvailableStartTimes(scheduleDay, existingBookings, neededSlots) {
  const dayStart = timeToMinutes(scheduleDay.startTime);
  const dayEnd = timeToMinutes(scheduleDay.endTime);
  const neededMin = neededSlots * SLOT_MIN;

  const busyRanges = existingBookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  const results = [];
  for (let start = dayStart; start + neededMin <= dayEnd; start += SLOT_MIN) {
    const end = start + neededMin;
    const overlaps = busyRanges.some((r) => start < r.end && end > r.start);
    if (!overlaps) {
      results.push(minutesToTime(start));
    }
  }
  return results;
}
