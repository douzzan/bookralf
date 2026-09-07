import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";

// GET is public — the booking wizard needs this to compute duration
// and the per-booking service cap before a customer ever logs in.
export async function GET() {
  try {
    const brackets = await prisma.bulkHaircutBracket.findMany({ orderBy: { minCount: "asc" } });
    return NextResponse.json(brackets);
  } catch (err) {
    console.error("GET /api/bulk-haircut-brackets failed:", err);
    return NextResponse.json({ error: "Could not load the bulk-haircut brackets." }, { status: 500 });
  }
}

function validateBracket({ minCount, maxCount, flatMinutes }) {
  if (!Number.isInteger(minCount) || !Number.isInteger(maxCount) || !Number.isInteger(flatMinutes)) {
    return "minCount, maxCount, and flatMinutes must all be whole numbers.";
  }
  if (minCount < 3) return "Bulk brackets start at a count of 3 — 1 and 2 always use their own actual durations.";
  if (maxCount < minCount) return "Max count must be greater than or equal to min count.";
  if (flatMinutes < 1) return "Flat minutes must be at least 1.";
  return null;
}

// POST — staff only. Create a new bracket.
export async function POST(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const error = validateBracket(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const bracket = await prisma.bulkHaircutBracket.create({
      data: { minCount: body.minCount, maxCount: body.maxCount, flatMinutes: body.flatMinutes },
    });
    return NextResponse.json(bracket, { status: 201 });
  } catch (err) {
    console.error("POST /api/bulk-haircut-brackets failed:", err);
    return NextResponse.json({ error: "Could not create the bracket." }, { status: 500 });
  }
}
