import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStaffRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function deny() {
  return NextResponse.json({ error: "Staff login required." }, { status: 401 });
}

// GET /api/day-tips?from=YYYY-MM-DD&to=YYYY-MM-DD   (staff) — tips entered in that range
export async function GET(request) {
  if (!isStaffRequest(request)) return deny();
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const where = {};
    if (from && DATE_RE.test(from)) where.date = { ...(where.date || {}), gte: from };
    if (to && DATE_RE.test(to)) where.date = { ...(where.date || {}), lte: to };
    const rows = await prisma.dayTips.findMany({ where, orderBy: { date: "asc" } });
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/day-tips failed:", err);
    return NextResponse.json({ error: "Could not load tips. Check the server logs." }, { status: 500 });
  }
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return null;
  return Math.round(n * 100) / 100;
}

// PUT { date, cashTips, etransferTips }  (staff) — sets that day's tip totals
export async function PUT(request) {
  if (!isStaffRequest(request)) return deny();
  try {
    const body = await request.json();
    const date = String(body.date || "");
    const cashTips = money(body.cashTips ?? 0);
    const etransferTips = money(body.etransferTips ?? 0);
    if (!DATE_RE.test(date)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    if (cashTips === null || etransferTips === null) {
      return NextResponse.json({ error: "Tips must be zero or a positive amount." }, { status: 400 });
    }
    const row = await prisma.dayTips.upsert({
      where: { date },
      update: { cashTips, etransferTips },
      create: { date, cashTips, etransferTips },
    });
    return NextResponse.json(row);
  } catch (err) {
    console.error("PUT /api/day-tips failed:", err);
    return NextResponse.json({ error: "Could not save tips. Check the server logs." }, { status: 500 });
  }
}
