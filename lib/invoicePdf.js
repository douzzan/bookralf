import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { WORDMARK_PNG_BASE64, WORDMARK_SIZE, BADGE_PNG_BASE64, BADGE_SIZE } from "./invoiceAssets.js";

// Brand palette (same family as the website and emails)
const INK = rgb(0.067, 0.047, 0.031); // #110c08 near-black brown
const PAGE = rgb(0.969, 0.945, 0.902); // #f7f1e6 warm cream
const CARD = rgb(1, 0.992, 0.973);
const CREAM_TEXT = rgb(0.949, 0.91, 0.863); // #f2e8dc — light text on dark
const GOLD = rgb(0.81, 0.608, 0.259); // #cf9b42
const BRASS = rgb(0.71, 0.514, 0.184); // #b6832f — gold text on cream (better contrast)
const TEXT = rgb(0.165, 0.122, 0.082); // #2a1f15
const MUTED = rgb(0.43, 0.36, 0.28);
const HAIR = rgb(0.87, 0.82, 0.72);
const PAID_GREEN = rgb(0.2, 0.45, 0.25);
const UNPAID_RED = rgb(0.64, 0.24, 0.16);

const GST_NUMBER = "76972 2570 RT0001";
const INSTAGRAM = "@ralfschops";

function money(n) {
  return `$${n.toFixed(2)}`;
}

function time12h(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// booking must include location and items.service (see lib/bookingInclude.js)
export async function generateInvoicePdf(booking, invoiceNumber) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter, points
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const wordmark = await pdfDoc.embedPng(Buffer.from(WORDMARK_PNG_BASE64, "base64"));
  const badge = await pdfDoc.embedPng(Buffer.from(BADGE_PNG_BASE64, "base64"));

  const margin = 50;
  const rightEdge = width - margin;

  function text(str, x, y, opts = {}) {
    page.drawText(String(str), { x, y, size: opts.size || 11, font: opts.font || font, color: opts.color || TEXT });
  }
  function textRight(str, y, opts = {}, edge = rightEdge) {
    const w = (opts.font || font).widthOfTextAtSize(String(str), opts.size || 11);
    text(str, edge - w, y, opts);
  }
  function textCenter(str, y, opts = {}) {
    const w = (opts.font || font).widthOfTextAtSize(String(str), opts.size || 11);
    text(str, (width - w) / 2, y, opts);
  }
  function wrap(str, f, size, maxWidth) {
    const words = String(str).split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  function rect(x, y, w, h, color, extra = {}) {
    page.drawRectangle({ x, y, width: w, height: h, color, ...extra });
  }

  // ---- Page background ----
  rect(0, 0, width, height, PAGE);

  // ---- Header band ----
  const bandH = 128;
  const bandY = height - bandH;
  rect(0, bandY, width, bandH, INK);
  rect(0, bandY - 3, width, 3, GOLD);

  const badgeSize = 64;
  page.drawImage(badge, { x: margin, y: bandY + (bandH - badgeSize) / 2, width: badgeSize, height: badgeSize });
  const wmW = 230;
  const wmH = (wmW * WORDMARK_SIZE.height) / WORDMARK_SIZE.width;
  page.drawImage(wordmark, { x: margin + badgeSize + 18, y: bandY + 70, width: wmW, height: wmH });
  text("HOUSE-CALL BARBERING", margin + badgeSize + 18, bandY + 50, { size: 8.5, font: bold, color: GOLD });

  textRight("INVOICE", bandY + 82, { size: 26, font: serifBold, color: GOLD });
  textRight(invoiceNumber, bandY + 62, { size: 11, font: bold, color: CREAM_TEXT });
  const issuedLabel = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Toronto",
  });
  textRight(issuedLabel, bandY + 47, { size: 10, color: CREAM_TEXT });
  textRight(`GST/HST No. ${GST_NUMBER}`, bandY + 32, { size: 8.5, color: CREAM_TEXT });

  // ---- Billed to / Visit details ----
  let y = bandY - 42;
  const col2 = margin + 300;
  text("BILLED TO", margin, y, { size: 9, font: bold, color: BRASS });
  text("VISIT DETAILS", col2, y, { size: 9, font: bold, color: BRASS });
  y -= 20;
  text(booking.customerName, margin, y, { size: 13, font: bold });
  text(booking.location.name, col2, y, { size: 13, font: bold });
  y -= 16;
  const addressLines = wrap(booking.address, font, 10, 240);
  const serviceDateLabel = new Date(`${booking.date}T12:00:00Z`).toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  text(serviceDateLabel, col2, y, { size: 10, color: MUTED });
  addressLines.forEach((l, i) => text(l, margin, y - i * 13, { size: 10, color: MUTED }));
  y -= 14;
  text(`${time12h(booking.startTime)} – ${time12h(booking.endTime)}`, col2, y, { size: 10, color: MUTED });
  y -= Math.max(0, addressLines.length - 1) * 13;
  if (booking.phone) text(booking.phone, margin, y, { size: 10, color: MUTED });
  y -= 13;
  if (booking.email) text(booking.email, margin, y, { size: 10, color: MUTED });

  // ---- Line items ----
  y -= 34;
  const headH = 26;
  rect(margin, y - 8, rightEdge - margin, headH, INK);
  const hy = y + 1;
  text("SERVICE", margin + 12, hy, { size: 9, font: bold, color: GOLD });
  text("QTY", margin + 290, hy, { size: 9, font: bold, color: GOLD });
  text("UNIT PRICE", margin + 340, hy, { size: 9, font: bold, color: GOLD });
  textRight("AMOUNT", hy, { size: 9, font: bold, color: GOLD }, rightEdge - 12);
  y -= headH + 8;

  for (const item of booking.items) {
    text(item.service.name, margin + 12, y, { size: 11 });
    text(String(item.quantity), margin + 290, y, { size: 11 });
    text(money(item.unitPrice), margin + 340, y, { size: 11 });
    textRight(money(item.unitPrice * item.quantity), y, { size: 11 }, rightEdge - 12);
    y -= 11;
    page.drawLine({ start: { x: margin, y }, end: { x: rightEdge, y }, thickness: 0.75, color: HAIR });
    y -= 17;
  }

  // ---- Total box + paid/unpaid stamp ----
  y -= 8;
  const boxW = 210;
  const boxH = 48;
  rect(rightEdge - boxW, y - boxH + 14, boxW, boxH, CARD, { borderColor: GOLD, borderWidth: 1.5 });
  text("TOTAL", rightEdge - boxW + 14, y - 14, { size: 9, font: bold, color: BRASS });
  textRight(money(booking.totalPrice), y - 22, { size: 22, font: bold }, rightEdge - 14);

  const stampText = booking.invoicePaid ? "PAID" : "UNPAID";
  const stampColor = booking.invoicePaid ? PAID_GREEN : UNPAID_RED;
  rect(margin, y - 20, 96, 30, undefined, { borderColor: stampColor, borderWidth: 1.5 });
  const sw = bold.widthOfTextAtSize(stampText, 13);
  text(stampText, margin + (96 - sw) / 2, y - 10, { size: 13, font: bold, color: stampColor });

  const totalBottom = y - boxH + 14;

  // ---- Thank-you ----
  const footerH = 58;
  // Centre the thank-you in the space between the total and the footer.
  let ty = (totalBottom + footerH) / 2 + 88;
  ty = Math.min(ty, totalBottom - 36);
  ty = Math.max(ty, footerH + 160); // never collide with the footer, even with many items
  if (ty <= totalBottom - 24) rect(width / 2 - 28, ty, 56, 1.5, GOLD);
  textCenter("Thank you.", ty - 50, { size: 46, font: serifItalic, color: INK });
  const msg =
    "It was a pleasure making the trip to your door. Every cut is personal to me, and I'm grateful you trusted me with yours. See you next time.";
  const msgLines = wrap(msg, font, 11, 380);
  msgLines.forEach((l, i) => textCenter(l, ty - 78 - i * 16, { size: 11, color: MUTED }));
  textCenter("— Ralf", ty - 78 - msgLines.length * 16 - 14, { size: 22, font: serifItalic, color: BRASS });

  // ---- Footer band ----
  rect(0, 0, width, footerH, INK);
  rect(0, footerH, width, 2, GOLD);
  const fb = 36;
  page.drawImage(badge, { x: margin, y: (footerH - fb) / 2, width: fb, height: fb });
  text("Questions? Just reply to the email this invoice came with.", margin + fb + 12, footerH / 2 + 2, {
    size: 9,
    color: CREAM_TEXT,
  });
  text("Ralf's Chops · House-Call Barbering", margin + fb + 12, footerH / 2 - 11, { size: 8, color: MUTED });
  textRight(`Instagram ${INSTAGRAM}`, footerH / 2 - 3, { size: 9, font: bold, color: GOLD });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
