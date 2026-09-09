import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingInclude } from "@/lib/bookingInclude";
import { isStaffRequest } from "@/lib/auth";
import { getOrCreateInvoiceNumber } from "@/lib/invoiceNumber";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { emailCustomerInvoice } from "@/lib/email";

// POST /api/bookings/:id/invoice — staff only.
// Generates (or reuses) the invoice number, builds the PDF fresh each
// time (so it always reflects the current paid/unpaid status), and
// emails it to the customer as an attachment. Manually triggered — no
// automatic sending anywhere in the app.
export async function POST(request, { params }) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const { id } = params;
    let booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const invoiceNumber = await getOrCreateInvoiceNumber(booking);
    if (!booking.invoiceNumber) {
      booking = await prisma.booking.update({
        where: { id },
        data: { invoiceNumber, invoicedAt: new Date() },
        include: bookingInclude,
      });
    }

    const pdfBuffer = await generateInvoicePdf(booking, invoiceNumber);
    const result = await emailCustomerInvoice(booking, invoiceNumber, pdfBuffer);

    if (!result.sent) {
      return NextResponse.json({ error: result.reason || "Could not send the invoice email.", booking }, { status: 502 });
    }

    return NextResponse.json({ sent: true, booking });
  } catch (err) {
    console.error("POST /api/bookings/[id]/invoice failed:", err);
    return NextResponse.json({ error: "Could not generate or send the invoice." }, { status: 500 });
  }
}

// PATCH /api/bookings/:id/invoice — staff only. body: { paid: true|false }
// Purely informational — no payment processing is involved, just a
// record-keeping flag staff controls themselves.
export async function PATCH(request, { params }) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const { id } = params;
    const { paid } = await request.json();
    const booking = await prisma.booking.update({
      where: { id },
      data: { invoicePaid: !!paid },
      include: bookingInclude,
    });
    return NextResponse.json(booking);
  } catch (err) {
    console.error("PATCH /api/bookings/[id]/invoice failed:", err);
    return NextResponse.json({ error: "Could not update invoice status." }, { status: 500 });
  }
}
