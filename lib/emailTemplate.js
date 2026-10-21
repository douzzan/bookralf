// Branded HTML shell + booking summary shared by every email we send.
// Email clients are picky: layout is tables with inline styles, images are
// PNGs (SVG is blocked by Gmail/Outlook) loaded from the live site's public
// URL, and the header is a dark band so the cream logo letters stay readable
// even when the message body is shown on white.

const INK = "#110c08";
const GOLD = "#cf9b42";
const PAPER = "#f7f1e6";
const TEXT = "#2a1f15";
const MUTED = "#7a6a55";
const HAIRLINE = "#e4d9c4";

const INSTAGRAM_URL = "https://www.instagram.com/ralfschops/";

// Where the logo PNGs are loaded from. SITE_URL wins if set; otherwise use
// the production domain Vercel exposes automatically; otherwise localhost
// (images simply won't load in a real inbox when testing locally).
function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

// Customer-typed text (name, address, cancel reason) goes into HTML —
// escape it so it can't inject markup into an email.
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function prettyDate(date) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return escapeHtml(date);
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function row(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;border-top:1px solid ${HAIRLINE};font:600 11px Arial,Helvetica,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:${MUTED};width:110px;vertical-align:top">${label}</td>
      <td style="padding:10px 0;border-top:1px solid ${HAIRLINE};font:15px/1.45 Arial,Helvetica,sans-serif;color:${TEXT};vertical-align:top">${value}</td>
    </tr>`;
}

export function bookingSummaryHtml(booking) {
  const serviceList = booking.items
    .map((i) => `${escapeHtml(i.service.name)}${i.quantity > 1 ? ` &times; ${i.quantity}` : ""}`)
    .join("<br>");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px">
      ${row("Date", prettyDate(booking.date))}
      ${row("Time", `${escapeHtml(booking.startTime)} &ndash; ${escapeHtml(booking.endTime)}`)}
      ${row("Service", serviceList)}
      ${row("Location", escapeHtml(booking.location.name))}
      ${row("Address", escapeHtml(booking.address))}
      <tr><td colspan="2" style="border-top:1px solid ${HAIRLINE};font-size:0;line-height:0;height:1px">&nbsp;</td></tr>
    </table>`;
}

// heading: big line under the logo. bodyHtml: everything else (already-safe HTML).
export function wrapEmail({ preheader = "", heading, bodyHtml }) {
  const base = siteUrl();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ralf's Chops</title>
</head>
<body style="margin:0;padding:0;background:#ece4d3">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ece4d3">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${PAPER};border-radius:4px;overflow:hidden">

        <!-- Header: dark band with wordmark -->
        <tr><td align="center" bgcolor="${INK}" style="background:${INK};padding:34px 20px 28px">
          <img src="${base}/images/email/email-wordmark.png" width="260" height="21" alt="Ralf's Chops" style="display:block;border:0;width:260px;max-width:90%;height:auto;margin:0 auto">
          <div style="margin-top:14px;font:11px Arial,Helvetica,sans-serif;letter-spacing:3px;text-transform:uppercase;color:${GOLD}">Mobile Barber &bull; Toronto</div>
        </td></tr>
        <tr><td style="background:${GOLD};font-size:0;line-height:0;height:3px">&nbsp;</td></tr>

        <!-- Body -->
        <tr><td style="padding:34px 36px 30px">
          <h1 style="margin:0 0 14px;font:italic 400 28px/1.2 Georgia,'Times New Roman',serif;color:${TEXT}">${heading}</h1>
          <div style="font:16px/1.6 Arial,Helvetica,sans-serif;color:${TEXT}">${bodyHtml}</div>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" bgcolor="${INK}" style="background:${INK};padding:26px 20px">
          <img src="${base}/images/email/email-badge.png" width="56" height="56" alt="RC" style="display:block;border:0;margin:0 auto 12px">
          <div style="font:12px/1.6 Arial,Helvetica,sans-serif;color:#b9ab94">Questions? Just reply to this email.</div>
          <div style="margin-top:8px;font:12px Arial,Helvetica,sans-serif"><a href="${INSTAGRAM_URL}" style="color:${GOLD};text-decoration:none">Instagram @ralfschops</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
