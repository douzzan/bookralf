import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "BookRalf <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Fire-and-forget. Never throws — a missing/invalid email setup should
// never break a booking action. Errors are logged to the server console.
async function sendEmail({ to, subject, html }) {
  const resend = getClient();
  if (!resend || !to) {
    console.log(`[email skipped — no RESEND_API_KEY or recipient] to=${to} subject=${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

function bookingSummaryHtml(booking) {
  const serviceList = booking.items
    .map((i) => `${i.service.name}${i.quantity > 1 ? ` x${i.quantity}` : ""}`)
    .join(", ");
  return `
    <div style="font-family:sans-serif;color:#222;line-height:1.5">
      <p><strong>Location:</strong> ${booking.location.name}</p>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Time:</strong> ${booking.startTime} – ${booking.endTime}</p>
      <p><strong>Service(s):</strong> ${serviceList}</p>
      <p><strong>Address:</strong> ${booking.address}</p>
    </div>
  `;
}

export async function emailCustomerConfirmed(booking) {
  await sendEmail({
    to: booking.email,
    subject: "Your booking is confirmed",
    html: `<p>Hi ${booking.customerName}, your booking has been confirmed. See you there!</p>${bookingSummaryHtml(booking)}`,
  });
}

export async function emailCustomerDeclined(booking) {
  await sendEmail({
    to: booking.email,
    subject: "Your booking request could not be accommodated",
    html: `<p>Hi ${booking.customerName}, unfortunately your booking request could not be accommodated. Please try a different time.</p>${bookingSummaryHtml(booking)}`,
  });
}

export async function emailCustomerCancelled(booking, reason) {
  await sendEmail({
    to: booking.email,
    subject: "Your booking has been cancelled",
    html: `<p>Hi ${booking.customerName}, your booking has been cancelled${reason ? ` (${reason})` : ""}. Please book a new time.</p>${bookingSummaryHtml(booking)}`,
  });
}

export async function emailAdminRequested(booking) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New booking request — ${booking.customerName}`,
    html: `<p>New booking request from ${booking.customerName} (${booking.phone}).</p>${bookingSummaryHtml(booking)}`,
  });
}

export async function emailAdminCancelled(booking) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Booking cancelled — ${booking.customerName}`,
    html: `<p>${booking.customerName} cancelled their booking.</p>${bookingSummaryHtml(booking)}`,
  });
}
