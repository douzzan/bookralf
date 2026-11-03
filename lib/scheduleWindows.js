import { getAvailableStartTimes, timeToMinutes, minutesToTime } from "@/lib/slots";

// A date can have several schedule windows at the same location (e.g. 3–4pm
// added first, 2–3pm added later). Windows that touch or overlap are merged
// into one working period, so 2–3 + 3–4 behaves like 2–4. Windows with a gap
// between them stay separate, and a booking never spans a gap.

export function mergeWindows(windows) {
  const sorted = [...windows].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const merged = [];
  for (const w of sorted) {
    const last = merged[merged.length - 1];
    if (last && timeToMinutes(w.startTime) <= timeToMinutes(last.endTime)) {
      if (timeToMinutes(w.endTime) > timeToMinutes(last.endTime)) last.endTime = w.endTime;
    } else {
      merged.push({ startTime: w.startTime, endTime: w.endTime });
    }
  }
  return merged;
}

// Every bookable start time across all of a date's windows ("HH:MM", sorted, unique).
export function getStartTimesForWindows(windows, existingBookings, durationMin) {
  const all = new Set();
  for (const w of mergeWindows(windows)) {
    for (const t of getAvailableStartTimes(w, existingBookings, durationMin)) all.add(t);
  }
  return [...all].sort();
}

// The saved schedule row a booking should be attached to: the one whose
// window contains the start time (falls back to the first row).
export function windowForStart(windows, startTime) {
  const s = timeToMinutes(startTime);
  return (
    windows.find((w) => s >= timeToMinutes(w.startTime) && s < timeToMinutes(w.endTime)) || windows[0]
  );
}

export { minutesToTime };
