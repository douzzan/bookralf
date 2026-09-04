// One-off script — run this ONCE after the `isBulkHaircut` migration, to
// fix up services that already existed in the database before this
// change (seed.js only creates missing rows, it won't update existing
// ones). Safe to run more than once if needed.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Deactivate Beard rather than deleting it — deleting would break the
  // foreign key on any past booking that used it, corrupting historical
  // records and the stats/reports built on them.
  const beard = await prisma.service.updateMany({
    where: { name: "Beard" },
    data: { active: false },
  });
  console.log(`Deactivated ${beard.count} "Beard" service row(s).`);

  const bulkNames = ["Haircut", "Child", "Haircut + Beard"];
  const bulk = await prisma.service.updateMany({
    where: { name: { in: bulkNames } },
    data: { isBulkHaircut: true },
  });
  console.log(`Marked ${bulk.count} service row(s) as isBulkHaircut.`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
