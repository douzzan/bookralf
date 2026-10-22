import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, serverError } from "@/lib/staffGuard";
import { cleanAnnouncement } from "@/lib/announcementInput";

export async function PATCH(request, { params }) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const { data, error } = cleanAnnouncement(await request.json(), { partial: true });
    if (error) return NextResponse.json({ error }, { status: 400 });
    const row = await prisma.announcement.update({ where: { id: params.id }, data });
    return NextResponse.json(row);
  } catch (err) {
    return serverError("PATCH /api/announcements/[id] failed:", err);
  }
}

export async function DELETE(request, { params }) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    await prisma.announcement.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("DELETE /api/announcements/[id] failed:", err);
  }
}
