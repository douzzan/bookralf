import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, serverError } from "@/lib/staffGuard";

// POST { type: "steps" | "faqs", ids: [id, id, ...] } — ids in their new order (staff)
export async function POST(request) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const { type, ids } = await request.json();
    const model = type === "steps" ? prisma.processStep : type === "faqs" ? prisma.faq : null;
    if (!model || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Bad reorder request." }, { status: 400 });
    }
    await prisma.$transaction(ids.map((id, i) => model.update({ where: { id: String(id) }, data: { order: i + 1 } })));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("POST /api/about/reorder failed:", err);
  }
}
