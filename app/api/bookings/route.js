import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingInclude } from "@/lib/bookingInclude";
import { slotsNeeded, getAvailableStartTimes, timeToMinutes, minutesToTime } from "@/lib/slots";
import { notifyBookingRequested } from "@/lib/notifications";

// GET /api/bookings?phone=xxx           -> a customer's own bookings
// GET /api/bookings?status=pending      -> admin: filter by status
// GET /api/bookings                     -> admin: all bookings, newest first
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const status = searchParams.get("status");

    const bookings = await prisma.booking.findMany({
      where: {
        ...(phone ? { phone } : {}),
        ...(status ? { status } : {}),
      },
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bookings);
  } catch (err) {
    console.error("GET /api/bookings failed:", err);
    return NextResponse.json({ error: "Could not load bookings. Check the server logs." }, { status: 500 });
  }
}

// POST — create a booking request (status: pending)
// body: { locationId, date, startTime, items: [{serviceId, quantity}],
//          customerName, phone, email, address }
export async function POST(request) {
  try {
    const body = await request.json();
    const { locationId, date, startTime, items, customerName, phone, email, address } = body;

    if (!locationId || !date || !startTime || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing location, date, time, or services" }, { status: 400 });
    }
    if (!customerName || !phone || !email || !address) {
      return NextResponse.json({ error: "Name, phone, email, and address are required" }, { status: 400 });
    }

    const scheduleDay = await prisma.scheduleDay.findFirst({ where: { locationId, date } });
    if (!scheduleDay) {
      return NextResponse.json({ error: "No schedule exists for that location and date" }, { status: 409 });
    }

    const serviceIds = items.map((i) => i.serviceId);
    const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
    if (services.length !== new Set(serviceIds).size) {
      return NextResponse.json({ error: "One or more services could not be found" }, { status: 400 });
    }

    let totalPrice = 0;
    let totalDurationMin = 0;
    const itemsToCreate = items.map((i) => {
      const svc = services.find((s) => s.id === i.serviceId);
      const qty = Math.max(1, Number(i.quantity) || 1);
      totalPrice += svc.price * qty;
      totalDurationMin += svc.durationMin * qty;
      return {
        serviceId: svc.id,
        quantity: qty,
        unitPrice: svc.price,
        unitMinutes: svc.durationMin,
      };
    });

    const needed = slotsNeeded(totalDurationMin);

    // Re-check availability server-side to prevent double-booking races.
    // Blocked across all locations sharing this date — Ralf can only be
    // one place at a time.
    const existingBookings = await prisma.booking.findMany({
      where: { date, status: { in: ["pending", "confirmed"] } },
      select: { startTime: true, endTime: true },
    });
    const validStarts = getAvailableStartTimes(scheduleDay, existingBookings, needed);
    if (!validStarts.includes(startTime)) {
      return NextResponse.json(
        { error: "That time is no longer available. Please choose another." },
        { status: 409 }
      );
    }

    const endTime = minutesToTime(timeToMinutes(startTime) + needed * 30);

    const booking = await prisma.booking.create({
      data: {
        customerName,
        phone,
        email,
        address,
        locationId,
        scheduleDayId: scheduleDay.id,
        date,
        startTime,
        endTime,
        totalPrice,
        totalDurationMin,
        totalSlots: needed,
        status: "pending",
        items: { create: itemsToCreate },
      },
      include: bookingInclude,
    });

    await notifyBookingRequested(booking);

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings failed:", err);
    return NextResponse.json({ error: "Could not create the booking. Check the server logs." }, { status: 500 });
  }
}
