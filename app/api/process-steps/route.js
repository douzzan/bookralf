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
    const steps = await prisma.processStep.findMany({ where: all ? {} : { active: true }, orderBy: { order: "asc" } });
    return NextResponse.json(steps);
  } catch (err) {
    return serverError("GET /api/process-steps failed:", err);
  }
}

export async function POST(request) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const b = await request.json();
    const title = String(b.title || "").trim().slice(0, 140);
    if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
    const last = await prisma.processStep.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    const step = await prisma.processStep.create({
      data: {
        title,
        description: String(b.description || "").slice(0, 2000),
        active: b.active !== false,
        order: (last?.order || 0) + 1,
      },
    });
    return NextResponse.json(step, { status: 201 });
  } catch (err) {
    return serverError("POST /api/process-steps failed:", err);
  }
}
