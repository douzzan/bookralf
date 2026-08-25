import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingInclude } from "@/lib/bookingInclude";
import { notifyCustomerCancelled } from "@/lib/notifications";

// DELETE /api/schedule/:id
// Trashing a scheduled day cancels every pending/confirmed booking tied
// to it and notifies each affected customer (in-app + email). Any other
// booking that still references this day (completed/declined/already
// cancelled) has its scheduleDayId cleared so the delete doesn't hit a
// foreign-key conflict.
export async function DELETE(request, { params }) {
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

    // Detach every booking still pointing at this day (past/completed/
    // declined/already-cancelled ones included) before deleting it.
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
