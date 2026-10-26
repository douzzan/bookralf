import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingInclude } from "@/lib/bookingInclude";
import { buildIcs } from "@/lib/calendar";

export const dynamic = "force-dynamic";

// GET /api/bookings/:id/calendar  ->  an .ics file for a confirmed booking.
// The booking id is an unguessable random string, and the file contains only
// that booking's own details.
export async function GET(request, { params }) {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: params.id }, include: bookingInclude });
    if (!booking || !["confirmed", "completed"].includes(booking.status)) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    const baseUrl = new URL(request.url).origin;
    return new NextResponse(buildIcs(booking, baseUrl), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="ralfs-chops-${booking.date}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/bookings/[id]/calendar failed:", err);
    return NextResponse.json({ error: "Could not create the calendar file." }, { status: 500 });
  }
}
