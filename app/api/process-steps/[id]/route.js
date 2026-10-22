import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, serverError } from "@/lib/staffGuard";

export async function PATCH(request, { params }) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const b = await request.json();
    const data = {};
    if (b.title !== undefined) {
      data.title = String(b.title).trim().slice(0, 140);
      if (!data.title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
    }
    if (b.description !== undefined) data.description = String(b.description).slice(0, 2000);
    if (b.active !== undefined) data.active = !!b.active;
    const step = await prisma.processStep.update({ where: { id: params.id }, data });
    return NextResponse.json(step);
  } catch (err) {
    return serverError("PATCH /api/process-steps/[id] failed:", err);
  }
}

export async function DELETE(request, { params }) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    await prisma.processStep.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("DELETE /api/process-steps/[id] failed:", err);
  }
}
