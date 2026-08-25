import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/notifications?phone=xxx -> notifications for that customer's bookings
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    if (!phone) return NextResponse.json([]);

    const notifications = await prisma.notification.findMany({
      where: { audience: "customer", booking: { phone } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(notifications);
  } catch (err) {
    console.error("GET /api/notifications failed:", err);
    return NextResponse.json({ error: "Could not load notifications. Check the server logs." }, { status: 500 });
  }
}

// PATCH { phone, markAllRead: true }
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { phone, markAllRead } = body;
    if (markAllRead && phone) {
      await prisma.notification.updateMany({
        where: { audience: "customer", read: false, booking: { phone } },
        data: { read: true },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/notifications failed:", err);
    return NextResponse.json({ error: "Could not update notifications. Check the server logs." }, { status: 500 });
  }
}
