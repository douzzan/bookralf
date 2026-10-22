import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";
import { requireStaff, serverError } from "@/lib/staffGuard";
import { getAboutPublic } from "@/lib/aboutData";

export const dynamic = "force-dynamic";

// GET /api/about            → public content (visible items only)
// GET /api/about?all=true   → staff only: everything, including hidden items
export async function GET(request) {
  try {
    const all = new URL(request.url).searchParams.get("all") === "true";
    if (all) {
      const denied = requireStaff(request);
      if (denied) return denied;
      const [about, steps, faqs, announcements] = await Promise.all([
        prisma.aboutContent.findUnique({ where: { id: "main" }, select: { heading: true, intro: true, photoMime: true, updatedAt: true } }),
        prisma.processStep.findMany({ orderBy: { order: "asc" } }),
        prisma.faq.findMany({ orderBy: { order: "asc" } }),
        prisma.announcement.findMany({ orderBy: [{ pinned: "desc" }, { postedOn: "desc" }, { createdAt: "desc" }] }),
      ]);
      return NextResponse.json({
        about: about && { heading: about.heading, intro: about.intro, hasPhoto: !!about.photoMime, photoVersion: about.updatedAt.getTime() },
        steps,
        faqs,
        announcements,
      });
    }
    const data = await getAboutPublic();
    return NextResponse.json({
      about: data.about && { heading: data.about.heading, intro: data.about.intro, hasPhoto: !!data.about.photoMime, photoVersion: data.about.updatedAt.getTime() },
      steps: data.steps,
      faqs: data.faqs,
      announcements: data.announcements,
    });
  } catch (err) {
    return serverError("GET /api/about failed:", err);
  }
}

// PUT /api/about  { heading, intro }  (staff)
export async function PUT(request) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const heading = String(body.heading ?? "").trim().slice(0, 80) || "About Ralf";
    const intro = String(body.intro ?? "").slice(0, 4000);
    const row = await prisma.aboutContent.upsert({
      where: { id: "main" },
      update: { heading, intro },
      create: { id: "main", heading, intro },
      select: { heading: true, intro: true },
    });
    return NextResponse.json(row);
  } catch (err) {
    return serverError("PUT /api/about failed:", err);
  }
}
