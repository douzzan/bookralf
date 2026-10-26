ALL BOOKINGS UPDATE

1) Unzip over the project root (replaces app/staff/bookings/page.js, adds prisma/backfill-cancelled-by.js).

2) prisma/schema.prisma — in model Booking, add this line (e.g. under "status"):
     cancelledBy      String?   // "client" | "staff" — who cancelled; null on older rows = staff

3) app/api/bookings/[id]/route.js — in the prisma.booking.update(...) call, change
     data: { status, paymentStatus },
   to
     data: {
       status,
       paymentStatus,
       ...(status === "cancelled" ? { cancelledBy: actor === "customer" ? "client" : "staff" } : {}),
     },
   (If your update call has no paymentStatus, just add the spread line next to status.)

4) Run:
     npx prisma migrate dev --name cancelled_by
     node prisma/backfill-cancelled-by.js        (once; fixes past client cancellations)
   On Ralf's new Supabase: npx prisma migrate deploy  (no backfill needed there).
