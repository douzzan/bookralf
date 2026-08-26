import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingInclude } from "@/lib/bookingInclude";
import { notifyCustomerCancelled } from "@/lib/notifications";
import { isStaffRequest } from "@/lib/auth";

// DELETE /api/schedule/:id — staff only.
// Cancels every pending/confirmed booking tied to it and notifies each
// affected customer (in-app + email).
export async function DELETE(request, { params }) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  const { id } = params;

  try {
    const existing = await prisma.scheduleDay.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Schedule day not found" }, { status: 404 });
    }

    const affected = await prisma.booking.findMany({
      where: { scheduleDayId: id, status: { in: ["pending", "confirmed"] } },
      include: bookingInclude,
    });

    for (const booking of affected) {
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "cancelled" } });
      await notifyCustomerCancelled(booking, "the scheduled day was removed");
    }

    await prisma.booking.updateMany({
      where: { scheduleDayId: id },
      data: { scheduleDayId: null },
    });

    await prisma.scheduleDay.delete({ where: { id } });

    return NextResponse.json({ deleted: true, cancelledBookings: affected.length });
  } catch (err) {
    console.error("Failed to delete schedule day:", err);
    return NextResponse.json({ error: "Could not delete this schedule day. Please try again." }, { status: 500 });
  }
}
