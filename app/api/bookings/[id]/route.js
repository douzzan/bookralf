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

// PATCH /api/bookings/:id
// body: { status, actor: "admin" | "customer" }
// Customers may only cancel their own booking (actor: "customer").
// Every other status change (confirm/decline/complete, or an admin
// cancelling on the customer's behalf) requires a staff login.
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, actor } = body;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const isCustomerSelfCancel = status === "cancelled" && actor === "customer";
    if (!isCustomerSelfCancel && !isStaffRequest(request)) {
      return NextResponse.json({ error: "Staff login required." }, { status: 401 });
    }

    const existing = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
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
