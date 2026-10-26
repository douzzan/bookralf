import { Resend } from "resend";
import { wrapEmail, bookingSummaryHtml, escapeHtml } from "./emailTemplate";
import { buildIcs, googleCalendarUrl } from "./calendar";

const FROM = process.env.EMAIL_FROM || "Ralf's Chops <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
// Customers who hit "reply" on a booking email reach Ralf's real inbox,
// even when FROM is a no-reply style address on the sending domain.
const REPLY_TO = ADMIN_EMAIL || undefined;

function baseUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

// "Add to calendar" buttons for the confirmation email: Google Calendar link,
// plus a link to the .ics file (Apple / Outlook). The .ics is also attached.
function calendarButtonsHtml(booking) {
  const base = baseUrl();
  const btn =
    "display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:4px;font-size:14px;font-weight:bold;text-decoration:none;font-family:Arial,Helvetica,sans-serif;";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 0"><tr><td>
    <p style="margin:0 0 10px;font-size:13px;color:#6e5c47">Add it to your calendar:</p>
    <a href="${googleCalendarUrl(booking, base)}" style="${btn}background:#cf9b42;color:#110c08">Google Calendar</a>
    <a href="${base}/api/bookings/${booking.id}/calendar" style="${btn}border:1px solid #cf9b42;color:#7a5a1f">Apple / Outlook</a>
  </td></tr></table>`;
}

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Fire-and-forget by default — a missing/invalid email setup should
// never break a booking action. Returns { sent, reason } so callers that
// DO need to know the outcome (like a manually-triggered invoice send)
// can react to it; callers that don't care can just ignore the result.
async function sendEmail({ to, subject, html, attachments, replyTo }) {
  const resend = getClient();
  if (!resend || !to) {
    const reason = !resend ? "Email isn't configured (no RESEND_API_KEY)." : "No recipient email address.";
    console.log(`[email skipped — ${reason}] to=${to} subject=${subject}`);
    return { sent: false, reason };
  }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments ? { attachments } : {}),
    });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send email:", err);
    return { sent: false, reason: err.message || "Unknown error sending email." };
  }
}

export async function emailCustomerConfirmed(booking) {
  await sendEmail({
    to: booking.email,
    replyTo: REPLY_TO,
    subject: "Your booking is confirmed",
    html: wrapEmail({
      preheader: `See you on ${booking.date} at ${booking.startTime}.`,
      heading: "Your booking is confirmed",
      bodyHtml: `<p style="margin:0">Hi ${escapeHtml(booking.customerName)}, your booking has been confirmed. See you there!</p>${bookingSummaryHtml(booking)}${calendarButtonsHtml(booking)}`,
    }),
    attachments: [
      {
        filename: "ralfs-chops-booking.ics",
        content: Buffer.from(buildIcs(booking, baseUrl()), "utf8").toString("base64"),
        contentType: "text/calendar",
      },
    ],
  });
}

export async function emailCustomerDeclined(booking) {
  await sendEmail({
    to: booking.email,
    replyTo: REPLY_TO,
    subject: "Your booking request could not be accommodated",
    html: wrapEmail({
      preheader: "Please try a different time.",
      heading: "We couldn't fit this one in",
      bodyHtml: `<p style="margin:0">Hi ${escapeHtml(booking.customerName)}, unfortunately your booking request could not be accommodated. Please try a different time.</p>${bookingSummaryHtml(booking)}`,
    }),
  });
}

export async function emailCustomerCancelled(booking, reason) {
  await sendEmail({
    to: booking.email,
    replyTo: REPLY_TO,
    subject: "Your booking has been cancelled",
    html: wrapEmail({
      preheader: "Please book a new time.",
      heading: "Your booking has been cancelled",
      bodyHtml: `<p style="margin:0">Hi ${escapeHtml(booking.customerName)}, your booking has been cancelled${reason ? ` (${escapeHtml(reason)})` : ""}. Please book a new time.</p>${bookingSummaryHtml(booking)}`,
    }),
  });
}

export async function emailCustomerReminder(booking) {
  await sendEmail({
    to: booking.email,
    replyTo: REPLY_TO,
    subject: "Reminder: your booking is today",
    html: wrapEmail({
      preheader: `Today at ${booking.startTime}.`,
      heading: "See you today",
      bodyHtml: `<p style="margin:0">Hi ${escapeHtml(booking.customerName)}, just a reminder that your booking is today. See you then!</p>${bookingSummaryHtml(booking)}`,
    }),
  });
}

export async function emailAdminRequested(booking) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New booking request — ${booking.customerName}`,
    html: wrapEmail({
      preheader: `${booking.date} at ${booking.startTime}`,
      heading: "New booking request",
      bodyHtml: `<p style="margin:0">New booking request from ${escapeHtml(booking.customerName)} (${escapeHtml(booking.phone)}).</p>${bookingSummaryHtml(booking)}`,
    }),
  });
}

export async function emailAdminCancelled(booking) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Booking cancelled — ${booking.customerName}`,
    html: wrapEmail({
      preheader: `${booking.date} at ${booking.startTime}`,
      heading: "Booking cancelled",
      bodyHtml: `<p style="margin:0">${escapeHtml(booking.customerName)} cancelled their booking.</p>${bookingSummaryHtml(booking)}`,
    }),
  });
}

// Manually triggered by staff, not automatic — the caller (the invoice
// API route) DOES check this result, since staff needs to know right
// away if the send actually worked.
export async function emailCustomerInvoice(booking, invoiceNumber, pdfBuffer) {
  return sendEmail({
    to: booking.email,
    replyTo: REPLY_TO,
    subject: `Invoice ${invoiceNumber} — Ralf's Chops`,
    html: wrapEmail({
      preheader: `Invoice ${invoiceNumber} — $${booking.totalPrice.toFixed(2)}`,
      heading: "Your invoice",
      bodyHtml: `<p style="margin:0">Hi ${escapeHtml(booking.customerName)}, please find attached your invoice for your recent visit.</p>${bookingSummaryHtml(
        booking
      )}<p style="margin:18px 0 0;font-size:18px"><strong>Total: $${booking.totalPrice.toFixed(2)}</strong></p>`,
    }),
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  });
}
