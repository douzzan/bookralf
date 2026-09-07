import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";

function validateBracket({ minCount, maxCount, flatMinutes }) {
  if (!Number.isInteger(minCount) || !Number.isInteger(maxCount) || !Number.isInteger(flatMinutes)) {
    return "minCount, maxCount, and flatMinutes must all be whole numbers.";
  }
  if (minCount < 3) return "Bulk brackets start at a count of 3 — 1 and 2 always use their own actual durations.";
  if (maxCount < minCount) return "Max count must be greater than or equal to min count.";
  if (flatMinutes < 1) return "Flat minutes must be at least 1.";
  return null;
}

// PATCH — staff only. Update a bracket's numbers.
export async function PATCH(request, { params }) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const { id } = params;
    const body = await request.json();
    const error = validateBracket(body);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const bracket = await prisma.bulkHaircutBracket.update({
      where: { id },
      data: { minCount: body.minCount, maxCount: body.maxCount, flatMinutes: body.flatMinutes },
    });
    return NextResponse.json(bracket);
  } catch (err) {
    console.error("PATCH /api/bulk-haircut-brackets/[id] failed:", err);
    return NextResponse.json({ error: "Could not update the bracket." }, { status: 500 });
  }
}

// DELETE — staff only. Brackets aren't referenced by any booking record
// directly (they're just a lookup table), so this is a real delete, no
// soft-delete needed.
export async function DELETE(request, { params }) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  try {
    const { id } = params;
    await prisma.bulkHaircutBracket.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/bulk-haircut-brackets/[id] failed:", err);
    return NextResponse.json({ error: "Could not delete the bracket." }, { status: 500 });
  }
}
