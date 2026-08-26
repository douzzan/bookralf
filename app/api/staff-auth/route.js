import { NextResponse } from "next/server";
import { STAFF_COOKIE, getExpectedToken, isStaffRequest } from "@/lib/auth";

// GET — used by the staff layout on page load to check "am I still logged in?"
export async function GET(request) {
  return NextResponse.json({ authenticated: isStaffRequest(request) });
}

// POST { password } — the actual login. The password is checked here,
// on the server, against a server-only env var (no NEXT_PUBLIC_ prefix,
// so it never ships to any browser).
export async function POST(request) {
  try {
    const { password } = await request.json();
    if (!password || !process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(STAFF_COOKIE, getExpectedToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (err) {
    console.error("POST /api/staff-auth failed:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// DELETE — log out
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(STAFF_COOKIE);
  return res;
}
