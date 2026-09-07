import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";

function validateServiceInput({ name, price, durationMin }) {
  if (!name || !name.trim()) return "Name is required.";
  if (typeof price !== "number" || price < 0) return "Price must be a positive number.";
  if (!Number.isInteger(durationMin) || durationMin < 1) return "Duration must be a whole number of minutes, at least 1.";
  return null;
}

// PATCH — staff only. Edit any field, including toggling `active` to
// deactivate/reactivate. This is how price and duration changes happen —
// existing bookings keep their own stored snapshot regardless (see
// BookingServiceItem.unitPrice / unitMinutes), so this only affects
// bookings made after the edit.
export async function PATCH(request, { params }) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const { id } = params;
    const body = await request.json();
    const error = validateServiceInput(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: body.name.trim(),
        description: body.description || "",
        price: body.price,
        durationMin: body.durationMin,
        isBulkHaircut: !!body.isBulkHaircut,
        active: body.active !== false,
      },
    });
    return NextResponse.json(service);
  } catch (err) {
    console.error("PATCH /api/services/[id] failed:", err);
    return NextResponse.json({ error: "Could not update the service." }, { status: 500 });
  }
}

// DELETE — staff only. Only permanently deletes if no booking has ever
// used this service (checking BookingServiceItem) — otherwise that would
// break the foreign key on historical records and corrupt past stats.
// If it's been used, this deactivates instead and says so.
export async function DELETE(request, { params }) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const { id } = params;
    const usageCount = await prisma.bookingServiceItem.count({ where: { serviceId: id } });

    if (usageCount > 0) {
      const service = await prisma.service.update({ where: { id }, data: { active: false } });
      return NextResponse.json({
        deleted: false,
        deactivated: true,
        service,
        message: `This service has been used in ${usageCount} booking(s), so it can't be permanently deleted — deactivated instead.`,
      });
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ deleted: true, deactivated: false });
  } catch (err) {
    console.error("DELETE /api/services/[id] failed:", err);
    return NextResponse.json({ error: "Could not delete the service." }, { status: 500 });
  }
}
