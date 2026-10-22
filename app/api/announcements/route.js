import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, serverError } from "@/lib/staffGuard";
import { cleanAnnouncement } from "@/lib/announcementInput";
import { getVisibleAnnouncements } from "@/lib/aboutData";

export const dynamic = "force-dynamic";

// Public: visible announcements (published + not expired), pinned first.
// ?all=true (staff): every announcement including drafts and expired ones.
export async function GET(request) {
  try {
    const all = new URL(request.url).searchParams.get("all") === "true";
    if (all) {
      const denied = requireStaff(request);
      if (denied) return denied;
      const rows = await prisma.announcement.findMany({
        orderBy: [{ pinned: "desc" }, { postedOn: "desc" }, { createdAt: "desc" }],
      });
      return NextResponse.json(rows);
    }
    return NextResponse.json(await getVisibleAnnouncements());
  } catch (err) {
    return serverError("GET /api/announcements failed:", err);
  }
}

export async function POST(request) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const { data, error } = cleanAnnouncement(await request.json());
    if (error) return NextResponse.json({ error }, { status: 400 });
    const row = await prisma.announcement.create({ data });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return serverError("POST /api/announcements failed:", err);
  }
}
