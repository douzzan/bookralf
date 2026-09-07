import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";

// GET — staff only. Returns EVERY service, active and inactive, so the
// Edit Services page can show (and potentially reactivate) deactivated
// ones. The public /api/services stays filtered to active-only.
export async function GET(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const services = await prisma.service.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json(services);
  } catch (err) {
    console.error("GET /api/admin/services failed:", err);
    return NextResponse.json({ error: "Could not load services." }, { status: 500 });
  }
}

// POST — staff only. Create a new service.
export async function POST(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, description, price, durationMin, isBulkHaircut, order } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "A service name is required." }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid non-negative number." }, { status: 400 });
    }
    if (!Number.isInteger(durationMin) || durationMin < 1) {
      return NextResponse.json({ error: "Duration must be a whole number of minutes, at least 1." }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        name: name.trim(),
        description: typeof description === "string" ? description : "",
        price,
        durationMin,
        isBulkHaircut: !!isBulkHaircut,
        order: Number.isInteger(order) ? order : 0,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/services failed:", err);
    return NextResponse.json({ error: "Could not create the service." }, { status: 500 });
  }
}
