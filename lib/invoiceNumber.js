import { prisma } from "./prisma";

// Once a booking has an invoice number, it keeps it forever — resending
// reuses the same number rather than issuing a new one each time.
// Format: INV-2026-0001, resetting to 0001 each new year.
export async function getOrCreateInvoiceNumber(booking) {
  if (booking.invoiceNumber) return booking.invoiceNumber;

  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const countThisYear = await prisma.booking.count({
    where: { invoiceNumber: { startsWith: prefix } },
  });
  const seq = String(countThisYear + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}
