import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";
import { getAvailableStartTimes } from "@/lib/slots";
import { dropPastStartTimes, getTorontoNow } from "@/lib/torontoTime";

// GET /api/schedule?locationId=xxx  -> upcoming schedule days (today or later)
// Public — customers need this to see which dates are bookable.
// Each day also carries `full: true` when not even the shortest active
// service still fits (everything booked, or the rest of today has passed),
// so the booking calendar can grey it out. It's display-only: the booking
// route still re-checks availability itself.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const todayStr = getTorontoNow().date; // Toronto's today, not UTC's

    const days = await prisma.scheduleDay.findMany({
      where: {
        date: { gte: todayStr },
        ...(locationId ? { locationId } : {}),
      },
      include: { location: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // Shortest active service = the smallest thing anyone could still book.
    const shortest = await prisma.service.findFirst({
      where: { active: true },
      orderBy: { durationMin: "asc" },
      select: { durationMin: true },
    });

    let result = days;
    if (shortest && days.length > 0) {
      // Ralf is one person, so a booking at any location blocks that time everywhere.
      const dates = [...new Set(days.map((d) => d.date))];
      const bookings = await prisma.booking.findMany({
        where: { date: { in: dates }, status: { in: ["pending", "confirmed"] } },
        select: { date: true, startTime: true, endTime: true },
      });
      const byDate = {};
      for (const b of bookings) (byDate[b.date] ||= []).push(b);

      result = days.map((d) => {
        const open = dropPastStartTimes(d.date, getAvailableStartTimes(d, byDate[d.date] || [], shortest.durationMin));
        return { ...d, full: open.length === 0 };
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/schedule failed:", err);
    return NextResponse.json({ error: "Could not load the schedule. Check the server logs." }, { status: 500 });
  }
}

// POST { dates, locationIds, startTime, endTime } — staff only.
export async function POST(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
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
