import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, serverError } from "@/lib/staffGuard";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const all = new URL(request.url).searchParams.get("all") === "true";
    if (all) {
      const denied = requireStaff(request);
      if (denied) return denied;
    }
    const faqs = await prisma.faq.findMany({ where: all ? {} : { active: true }, orderBy: { order: "asc" } });
    return NextResponse.json(faqs);
  } catch (err) {
    return serverError("GET /api/faqs failed:", err);
  }
}

export async function POST(request) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const b = await request.json();
    const question = String(b.question || "").trim().slice(0, 240);
    if (!question) return NextResponse.json({ error: "A question is required." }, { status: 400 });
    const last = await prisma.faq.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    const faq = await prisma.faq.create({
      data: {
        question,
        answer: String(b.answer || "").slice(0, 4000),
        active: b.active !== false,
        order: (last?.order || 0) + 1,
      },
    });
    return NextResponse.json(faq, { status: 201 });
  } catch (err) {
    return serverError("POST /api/faqs failed:", err);
  }
}
