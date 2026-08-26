import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";

export async function GET(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const notifications = await prisma.notification.findMany({
      where: { audience: "admin" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(notifications);
  } catch (err) {
    console.error("GET /api/staff-notifications failed:", err);
    return NextResponse.json({ error: "Could not load notifications. Check the server logs." }, { status: 500 });
  }
}

// PATCH { markAllRead: true }
export async function PATCH(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (body.markAllRead) {
      await prisma.notification.updateMany({ where: { audience: "admin", read: false }, data: { read: true } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/staff-notifications failed:", err);
    return NextResponse.json({ error: "Could not update notifications. Check the server logs." }, { status: 500 });
  }
}
