import { timeToMinutes } from "./slots";

const SLOT_MIN = 30;

// Current date + minutes-since-midnight in Toronto. Vercel's servers run in
// UTC, so the clock is read through the IANA zone name "America/Toronto" —
// that switches between EST and EDT on the real change-over dates by itself,
// with no hardcoded -4/-5 offset to keep in sync. `now` is injectable for testing.
export function getTorontoNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`, // YYYY-MM-DD
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// Drops start times that are already over, including the 30-minute block
// we're currently in: at 3:58pm the 3:30 slot is gone and 4:00 is the first
// one offered; at 4:10pm the first one offered is 4:30. Past dates offer
// nothing; future dates are untouched.
export function dropPastStartTimes(date, startTimes, now = new Date()) {
  const today = getTorontoNow(now);
  if (date < today.date) return [];
  if (date > today.date) return startTimes;
  const cutoff = (Math.floor(today.minutes / SLOT_MIN) + 1) * SLOT_MIN; // start of the next block
  return startTimes.filter((t) => timeToMinutes(t) >= cutoff);
}
