import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "BookRalf <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Fire-and-forget by default — a missing/invalid email setup should
// never break a booking action. Returns { sent, reason } so callers that
// DO need to know the outcome (like a manually-triggered invoice send)
// can react to it; callers that don't care can just ignore the result.
async function sendEmail({ to, subject, html, attachments }) {
  const resend = getClient();
  if (!resend || !to) {
    const reason = !resend ? "Email isn't configured (no RESEND_API_KEY)." : "No recipient email address.";
    console.log(`[email skipped — ${reason}] to=${to} subject=${subject}`);
    return { sent: false, reason };
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html, ...(attachments ? { attachments } : {}) });
    return { sent: true };
  } catch (err) {
    console.error("Failed to send email:", err);
    return { sent: false, reason: err.message || "Unknown error sending email." };
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

export async function emailCustomerReminder(booking) {
  await sendEmail({
    to: booking.email,
    subject: "Reminder: your booking is today",
    html: `<p>Hi ${booking.customerName}, just a reminder that your booking is today. See you then!</p>${bookingSummaryHtml(booking)}`,
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

// Manually triggered by staff, not automatic — the caller (the invoice
// API route) DOES check this result, since staff needs to know right
// away if the send actually worked.
export async function emailCustomerInvoice(booking, invoiceNumber, pdfBuffer) {
  return sendEmail({
    to: booking.email,
    subject: `Invoice ${invoiceNumber} — Book Ralf`,
    html: `<p>Hi ${booking.customerName}, please find attached your invoice for your recent visit.</p>${bookingSummaryHtml(
      booking
    )}<p><strong>Total: $${booking.totalPrice.toFixed(2)}</strong></p>`,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  });
}
