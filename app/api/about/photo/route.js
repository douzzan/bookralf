import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, serverError } from "@/lib/staffGuard";

export const dynamic = "force-dynamic";

const MAX_BYTES = 900 * 1024; // the staff page shrinks photos to ~100-250 KB; this is just a safety net
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Public: serves Ralf's photo (the page adds ?v=<timestamp> so a new photo shows immediately).
export async function GET() {
  try {
    const row = await prisma.aboutContent.findUnique({ where: { id: "main" }, select: { photo: true, photoMime: true } });
    if (!row?.photo || !row.photoMime) return new NextResponse("No photo", { status: 404 });
    return new NextResponse(row.photo, {
      headers: { "Content-Type": row.photoMime, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    return serverError("GET /api/about/photo failed:", err);
  }
}

// Staff: PUT { dataUrl: "data:image/jpeg;base64,..." }
export async function PUT(request) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    const { dataUrl } = await request.json();
    const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(String(dataUrl || ""));
    if (!m || !ALLOWED.includes(m[1])) {
      return NextResponse.json({ error: "Please choose a JPG, PNG or WebP image." }, { status: 400 });
    }
    const buf = Buffer.from(m[2], "base64");
    if (buf.length === 0 || buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "That photo is too large. Try a smaller one." }, { status: 400 });
    }
    const row = await prisma.aboutContent.upsert({
      where: { id: "main" },
      update: { photo: buf, photoMime: m[1] },
      create: { id: "main", photo: buf, photoMime: m[1] },
      select: { updatedAt: true },
    });
    return NextResponse.json({ ok: true, photoVersion: row.updatedAt.getTime() });
  } catch (err) {
    return serverError("PUT /api/about/photo failed:", err);
  }
}

// Staff: remove the photo (About page goes back to text only)
export async function DELETE(request) {
  const denied = requireStaff(request);
  if (denied) return denied;
  try {
    await prisma.aboutContent.updateMany({ where: { id: "main" }, data: { photo: null, photoMime: null } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError("DELETE /api/about/photo failed:", err);
  }
}
