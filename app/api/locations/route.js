import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json(locations);
  } catch (err) {
    console.error("GET /api/locations failed:", err);
    return NextResponse.json({ error: "Could not load locations. Check the server logs." }, { status: 500 });
  }
}
