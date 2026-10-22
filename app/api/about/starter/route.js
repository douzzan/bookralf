import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, serverError } from "@/lib/staffGuard";
import defaults from "@/lib/aboutDefaults";

// Staff: fills in the draft starter content for anything that is still empty.
// Never touches existing content, so it is safe to press more than once.
export async function POST(request) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const result = await defaults.seedAboutIfEmpty(prisma);
    return NextResponse.json(result);
  } catch (err) {
    return serverError("POST /api/about/starter failed:", err);
  }
}
