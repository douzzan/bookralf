import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingInclude } from "@/lib/bookingInclude";
import { notifyBookingReminder } from "@/lib/notifications";

// GET /api/cron/reminders
// Triggered by Vercel Cron twice daily (see vercel.json — once for
// daylight saving, once for standard time), but only actually does
// anything during the invocation that's real 9am in Toronto. The other
// trigger sees a different local hour and no-ops. This sidesteps the
// fact that Vercel Cron is UTC-only with no per-schedule timezone
// support, and that DST would otherwise make a single fixed UTC time
// drift by an hour twice a year.
const TIMEZONE = "America/Toronto";
const TARGET_HOUR = 9;

export async function GET(request) {
  // Vercel automatically sends this header on cron-triggered requests
  // when CRON_SECRET is set as an env var — verifies the request is
  // really from Vercel's scheduler, not a random visitor hitting the URL.
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const currentHour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "2-digit", hour12: false }).format(new Date())
  );

  if (currentHour !== TARGET_HOUR) {
    return NextResponse.json({ skipped: true, reason: `Not ${TARGET_HOUR}am in Toronto right now (it's ${currentHour}:00).` });
  }

  const todayToronto = new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE }); // "YYYY-MM-DD"

  try {
    const dueToday = await prisma.booking.findMany({
      where: { date: todayToronto, status: "confirmed", reminderSentAt: null },
      include: bookingInclude,
    });

    for (const booking of dueToday) {
      await notifyBookingReminder(booking);
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } });
    }

    return NextResponse.json({ sent: dueToday.length, date: todayToronto });
  } catch (err) {
    console.error("GET /api/cron/reminders failed:", err);
    return NextResponse.json({ error: "Reminder run failed. Check the server logs." }, { status: 500 });
  }
}
