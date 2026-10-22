import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, serverError } from "@/lib/staffGuard";

export async function PATCH(request, { params }) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const b = await request.json();
    const data = {};
    if (b.question !== undefined) {
      data.question = String(b.question).trim().slice(0, 240);
      if (!data.question) return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }
    if (b.answer !== undefined) data.answer = String(b.answer).slice(0, 4000);
    if (b.active !== undefined) data.active = !!b.active;
    const faq = await prisma.faq.update({ where: { id: params.id }, data });
    return NextResponse.json(faq);
  } catch (err) {
    return serverError("PATCH /api/faqs/[id] failed:", err);
  }
}

export async function DELETE(request, { params }) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    await prisma.faq.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("DELETE /api/faqs/[id] failed:", err);
  }
}
