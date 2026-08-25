import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(services);
  } catch (err) {
    console.error("GET /api/services failed:", err);
    return NextResponse.json({ error: "Could not load services. Check the server logs." }, { status: 500 });
  }
}
