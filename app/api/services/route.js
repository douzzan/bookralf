import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";

// GET /api/services            -> active services only (public — the booking wizard uses this)
// GET /api/services?all=true   -> every service, active and inactive (staff only — for the Edit Services page)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    if (all && !isStaffRequest(request)) {
      return NextResponse.json({ error: "Staff login required." }, { status: 401 });
    }

    const services = await prisma.service.findMany({
      where: all ? {} : { active: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(services);
  } catch (err) {
    console.error("GET /api/services failed:", err);
    return NextResponse.json({ error: "Could not load services. Check the server logs." }, { status: 500 });
  }
}

function validateServiceInput({ name, price, durationMin }) {
  if (!name || !name.trim()) return "Name is required.";
  if (typeof price !== "number" || price < 0) return "Price must be a positive number.";
  if (!Number.isInteger(durationMin) || durationMin < 1) return "Duration must be a whole number of minutes, at least 1.";
  return null;
}

// POST — staff only. Create a new service.
export async function POST(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const error = validateServiceInput(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const maxOrder = await prisma.service.aggregate({ _max: { order: true } });

    const service = await prisma.service.create({
      data: {
        name: body.name.trim(),
        description: body.description || "",
        price: body.price,
        durationMin: body.durationMin,
        isBulkHaircut: !!body.isBulkHaircut,
        active: body.active !== false,
        order: (maxOrder._max.order || 0) + 1,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    console.error("POST /api/services failed:", err);
    return NextResponse.json({ error: "Could not create the service." }, { status: 500 });
  }
}
