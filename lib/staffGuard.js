import { NextResponse } from "next/server";
import { isStaffRequest } from "@/lib/auth";

// Returns a 401 response when the request isn't from logged-in staff, otherwise null.
export function requireStaff(request) {
  if (!isStaffRequest(request)) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }
  return null;
}

export function serverError(label, err) {
  console.error(label, err);
  return NextResponse.json({ error: "Something went wrong. Check the server logs." }, { status: 500 });
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
