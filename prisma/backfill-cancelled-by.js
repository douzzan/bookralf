// One-off: marks existing bookings that the CUSTOMER cancelled as cancelledBy = "client".
// (Those are the ones that triggered the "Booking Cancelled by Customer" admin notification.)
// Everything else cancelled/declined stays as "staff". Safe to run more than once.
//   node prisma/backfill-cancelled-by.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const n = await prisma.$executeRaw`
    UPDATE "Booking" SET "cancelledBy" = 'client'
    WHERE status = 'cancelled' AND "cancelledBy" IS NULL
      AND id IN (SELECT "bookingId" FROM "Notification"
                 WHERE audience = 'admin' AND type = 'cancelled' AND "bookingId" IS NOT NULL)`;
  console.log(`Marked ${n} booking(s) as client-cancelled.`);
})().finally(() => prisma.$disconnect());
