import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/schedule?locationId=xxx  -> upcoming schedule days (today or later)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const todayStr = new Date().toISOString().slice(0, 10);

    const days = await prisma.scheduleDay.findMany({
      where: {
        date: { gte: todayStr },
        ...(locationId ? { locationId } : {}),
      },
      include: { location: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(days);
  } catch (err) {
    console.error("GET /api/schedule failed:", err);
    return NextResponse.json({ error: "Could not load the schedule. Check the server logs." }, { status: 500 });
  }
}

// POST { dates: ["YYYY-MM-DD", ...], locationIds: [id, ...], startTime, endTime }
// Creates one ScheduleDay per (date x location) combination. This
// covers both the "Single Date" and "Multiple Days" admin flows since
// a single date + single location is just a 1x1 cross product.
export async function POST(request) {
  try {
    const body = await request.json();
    const { dates, locationIds, startTime, endTime } = body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "At least one date is required" }, { status: 400 });
    }
    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({ error: "At least one location is required" }, { status: 400 });
    }
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Start and end time are required" }, { status: 400 });
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const rows = [];
    for (const date of dates) {
      for (const locationId of locationIds) {
        rows.push({ date, locationId, startTime, endTime });
      }
    }

    const created = await prisma.$transaction(
      rows.map((r) => prisma.scheduleDay.create({ data: r, include: { location: true } }))
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/schedule failed:", err);
    return NextResponse.json({ error: "Could not save that schedule day. Check the server logs." }, { status: 500 });
  }
}
