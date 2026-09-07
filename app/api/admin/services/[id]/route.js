import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";

// PATCH — staff only. Update any subset of a service's editable fields,
// including toggling `active` (used for "deactivate" — never a hard
// delete, since that would break the foreign key on any past booking
// that used this service, corrupting historical records and reports).
export async function PATCH(request, { params }) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const { id } = params;
    const body = await request.json();
    const data = {};

    if (typeof body.name === "string") {
      if (!body.name.trim()) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
      data.name = body.name.trim();
    }
    if (typeof body.description === "string") data.description = body.description;
    if (body.price !== undefined) {
      if (!Number.isFinite(body.price) || body.price < 0) {
        return NextResponse.json({ error: "Price must be a valid non-negative number." }, { status: 400 });
      }
      data.price = body.price;
    }
    if (body.durationMin !== undefined) {
      if (!Number.isInteger(body.durationMin) || body.durationMin < 1) {
        return NextResponse.json({ error: "Duration must be a whole number of minutes, at least 1." }, { status: 400 });
      }
      data.durationMin = body.durationMin;
    }
    if (typeof body.isBulkHaircut === "boolean") data.isBulkHaircut = body.isBulkHaircut;
    if (typeof body.active === "boolean") data.active = body.active;

    const service = await prisma.service.update({ where: { id }, data });
    return NextResponse.json(service);
  } catch (err) {
    console.error("PATCH /api/admin/services/[id] failed:", err);
    return NextResponse.json({ error: "Could not update the service." }, { status: 500 });
  }
}
