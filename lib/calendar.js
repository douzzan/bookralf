// Calendar helpers: builds an .ics file and an "Add to Google Calendar" link
// for a booking. Pure functions (no Node-only APIs) so the My Bookings page
// can use them in the browser and the server can use them for emails.
//
// All times are Ralf's local time (America/Toronto). They're converted to UTC
// for the calendar so they land correctly on any phone or time zone.

const ZONE = "America/Toronto";

// Offset (in minutes) of Toronto from UTC at a given instant — DST-safe.
function zoneOffsetMinutes(utcMs) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return Math.round((asUtc - utcMs) / 60000);
}

// "2026-11-05" + "14:30" (Toronto wall clock) -> Date (the real instant)
export function torontoToDate(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi, 0);
  let utc = wall - zoneOffsetMinutes(wall) * 60000;
  utc = wall - zoneOffsetMinutes(utc) * 60000; // second pass settles DST edge cases
  return new Date(utc);
}

function icsStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function serviceNames(booking) {
  return booking.items.map((i) => (i.quantity > 1 ? `${i.service.name} x${i.quantity}` : i.service.name)).join(", ");
}

function eventDetails(booking, baseUrl) {
  const title = `Haircut with Ralf's Chops`;
  const lines = [
    `Services: ${serviceNames(booking)}`,
    `Area: ${booking.location.name}`,
    `Total: $${Number(booking.totalPrice).toFixed(2)}`,
    "",
    "Need to change or cancel? Reply to your confirmation email" + (baseUrl ? ` or visit ${baseUrl}/my-bookings` : "."),
  ];
  return { title, description: lines.join("\n"), location: booking.address };
}

function icsEscape(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545: lines max 75 octets, continuation lines start with a space.
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 70) {
    out.push(rest.slice(0, 70));
    rest = " " + rest.slice(70);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(booking, baseUrl = "") {
  const start = torontoToDate(booking.date, booking.startTime);
  const end = torontoToDate(booking.date, booking.endTime);
  const { title, description, location } = eventDetails(booking, baseUrl);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ralf's Chops//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${booking.id}@ralfschops`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape("Your haircut with Ralf's Chops is in 1 hour")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(booking, baseUrl = "") {
  const start = torontoToDate(booking.date, booking.startTime);
  const end = torontoToDate(booking.date, booking.endTime);
  const { title, description, location } = eventDetails(booking, baseUrl);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${icsStamp(start)}/${icsStamp(end)}`,
    details: description,
    location,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
