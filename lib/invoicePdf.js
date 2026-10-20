import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const GOLD = rgb(0.81, 0.61, 0.26);
const GRAY = rgb(0.45, 0.45, 0.45);
const BLACK = rgb(0.1, 0.1, 0.1);
const LIGHT_LINE = rgb(0.8, 0.8, 0.8);
const PAID_GREEN = rgb(0.2, 0.55, 0.3);
const UNPAID_RED = rgb(0.7, 0.25, 0.2);

function money(n) {
  return `$${n.toFixed(2)}`;
}

// booking must include location and items.service (see lib/bookingInclude.js)
export async function generateInvoicePdf(booking, invoiceNumber) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter, points
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const rightEdge = width - margin;

  function text(str, x, y, opts = {}) {
    page.drawText(String(str), { x, y, size: opts.size || 11, font: opts.font || font, color: opts.color || BLACK });
  }
  function textRight(str, y, opts = {}) {
    const size = opts.size || 11;
    const f = opts.font || font;
    const w = f.widthOfTextAtSize(String(str), size);
    text(str, rightEdge - w, y, opts);
  }
  function hLine(y, color = LIGHT_LINE, thickness = 1) {
    page.drawLine({ start: { x: margin, y }, end: { x: rightEdge, y }, thickness, color });
  }

  let y = height - 60;

  // Header
  text("Ralf's Chops", margin, y, { size: 24, font: bold, color: GOLD });
  textRight("INVOICE", y + 3, { size: 20, font: bold });
  y -= 18;
  text("House-Call Barbering", margin, y, { size: 10, color: GRAY });
  textRight(invoiceNumber, y, { size: 11, font: bold });
  y -= 14;
  const issuedLabel = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  textRight(`Date: ${issuedLabel}`, y, { size: 10, color: GRAY });

  y -= 40;
  hLine(y);
  y -= 30;

  // Bill To / Service details, two columns
  text("Bill To", margin, y, { size: 10, font: bold, color: GRAY });
  text("Service Details", margin + 280, y, { size: 10, font: bold, color: GRAY });
  y -= 18;
  text(booking.customerName, margin, y, { size: 12 });
  text(booking.location.name, margin + 280, y, { size: 12 });
  y -= 16;
  text(booking.address, margin, y, { size: 10, color: GRAY });
  const serviceDateLabel = new Date(`${booking.date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  text(serviceDateLabel, margin + 280, y, { size: 10, color: GRAY });
  y -= 16;
  text(booking.phone, margin, y, { size: 10, color: GRAY });
  text(`${booking.startTime} – ${booking.endTime}`, margin + 280, y, { size: 10, color: GRAY });

  y -= 40;
  hLine(y);
  y -= 30;

  // Line items table
  text("Service", margin, y, { size: 10, font: bold, color: GRAY });
  text("Qty", margin + 280, y, { size: 10, font: bold, color: GRAY });
  text("Unit Price", margin + 340, y, { size: 10, font: bold, color: GRAY });
  textRight("Amount", y, { size: 10, font: bold, color: GRAY });
  y -= 8;
  hLine(y);
  y -= 22;

  for (const item of booking.items) {
    text(item.service.name, margin, y);
    text(String(item.quantity), margin + 280, y);
    text(money(item.unitPrice), margin + 340, y);
    textRight(money(item.unitPrice * item.quantity), y);
    y -= 20;
  }

  y -= 4;
  hLine(y);
  y -= 26;

  text("Total", margin + 340, y, { size: 13, font: bold });
  textRight(money(booking.totalPrice), y, { size: 13, font: bold });

  // Paid / unpaid stamp
  y -= 55;
  const stampText = booking.invoicePaid ? "PAID" : "UNPAID";
  const stampColor = booking.invoicePaid ? PAID_GREEN : UNPAID_RED;
  page.drawRectangle({
    x: margin,
    y: y - 8,
    width: 95,
    height: 26,
    borderColor: stampColor,
    borderWidth: 1.5,
  });
  text(stampText, margin + 18, y, { size: 13, font: bold, color: stampColor });

  text("Thank you for choosing Ralf's Chops.", margin, 60, { size: 9, color: GRAY });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
