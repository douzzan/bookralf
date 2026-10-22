import { NextResponse } from "next/server";
import { getBannerAnnouncement } from "@/lib/aboutData";

export const dynamic = "force-dynamic";

// Public: the one announcement to show in the banner (newest pinned + published), or null.
export async function GET() {
  try {
    const a = await getBannerAnnouncement();
    return NextResponse.json(a ? { id: a.id, title: a.title, body: a.body, postedOn: a.postedOn } : null);
  } catch (err) {
    console.error("GET /api/announcements/banner failed:", err);
    return NextResponse.json(null); // never let a banner problem break the page
  }
}
