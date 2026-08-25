import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slotsNeeded, getAvailableStartTimes } from "@/lib/slots";

// GET /api/availability?locationId=&date=&durationMin=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const date = searchParams.get("date");
    const durationMin = Number(searchParams.get("durationMin") || 0);

    if (!locationId || !date || !durationMin) {
      return NextResponse.json({ error: "locationId, date, and durationMin are required" }, { status: 400 });
    }

    const scheduleDay = await prisma.scheduleDay.findFirst({ where: { locationId, date } });
    if (!scheduleDay) {
      return NextResponse.json({ scheduleDayId: null, startTimes: [] });
    }

    // Ralf can only be in one place at a time — so a booking at any
    // location on this date blocks that time everywhere else too, not
    // just within the same location's schedule entry.
    const existingBookings = await prisma.booking.findMany({
      where: { date, status: { in: ["pending", "confirmed"] } },
      select: { startTime: true, endTime: true },
    });

    const needed = slotsNeeded(durationMin);
    const startTimes = getAvailableStartTimes(scheduleDay, existingBookings, needed);

    return NextResponse.json({
      scheduleDayId: scheduleDay.id,
      dayStart: scheduleDay.startTime,
      dayEnd: scheduleDay.endTime,
      slotsNeeded: needed,
      startTimes,
    });
  } catch (err) {
    console.error("GET /api/availability failed:", err);
    return NextResponse.json({ error: "Could not check availability. Check the server logs." }, { status: 500 });
  }
}
