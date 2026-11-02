import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingInclude } from "@/lib/bookingInclude";
import {
  notifyBookingConfirmed,
  notifyBookingDeclined,
  notifyCustomerCancelled,
  notifyAdminCancelled,
} from "@/lib/notifications";
import { isStaffRequest } from "@/lib/auth";

const VALID_STATUSES = ["pending", "confirmed", "declined", "cancelled", "completed"];
const PAYMENT_METHODS = ["cash", "etransfer"];

// PATCH /api/bookings/:id
// body: { status, actor: "admin" | "customer", paymentMethod? }
// Completing a booking requires paymentMethod ("cash" | "etransfer") — Ralf
// only marks a booking completed once he has been paid, so this also marks
// the invoice as paid. Sending just { paymentMethod } (no status) corrects the
// method on an already-completed booking. Both are staff-only.
// Customers may only cancel their own booking (actor: "customer").
// Every other status change (confirm/decline/complete, or an admin
// cancelling on the customer's behalf) requires a staff login.
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, actor, paymentMethod } = body;

    // Correcting the payment method on a completed booking (staff only)
    if (status === undefined && paymentMethod !== undefined) {
      if (!isStaffRequest(request)) {
        return NextResponse.json({ error: "Staff login required." }, { status: 401 });
      }
      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return NextResponse.json({ error: "Payment method must be cash or etransfer." }, { status: 400 });
      }
      const current = await prisma.booking.findUnique({ where: { id }, select: { status: true } });
      if (!current) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      if (current.status !== "completed") {
        return NextResponse.json({ error: "Only completed bookings have a payment method." }, { status: 400 });
      }
      const updated = await prisma.booking.update({ where: { id }, data: { paymentMethod }, include: bookingInclude });
      return NextResponse.json(updated);
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const isCustomerSelfCancel = status === "cancelled" && actor === "customer";
    if (!isCustomerSelfCancel && !isStaffRequest(request)) {
      return NextResponse.json({ error: "Staff login required." }, { status: 401 });
    }

    if (status === "completed" && !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: "Choose cash or e-transfer to complete this booking." }, { status: 400 });
    }

    const existing = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status,
        ...(status === "cancelled" ? { cancelledBy: actor === "customer" ? "client" : "staff" } : {}),
        ...(status === "completed" ? { paymentMethod, invoicePaid: true } : {}),
      },
      include: bookingInclude,
    });

    if (status === "confirmed") {
      await notifyBookingConfirmed(booking);
    } else if (status === "declined") {
      await notifyBookingDeclined(booking);
    } else if (status === "cancelled") {
      if (actor === "customer") {
        await notifyAdminCancelled(booking);
      } else {
        await notifyCustomerCancelled(booking, null);
      }
    }

    return NextResponse.json(booking);
  } catch (err) {
    console.error("PATCH /api/bookings/[id] failed:", err);
    return NextResponse.json({ error: "Could not update that booking. Check the server logs." }, { status: 500 });
  }
}
