const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const locations = [
    { name: "Thornhill", description: "Thornhill area house visits", order: 1 },
    { name: "Clanton", description: "Clanton area house visits", order: 2 },
    { name: "South", description: "South area house visits", order: 3 },
    { name: "Others", description: "Outside the usual areas — let us know your address", order: 4 },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { name: loc.name },
      update: {},
      create: loc,
    });
  }

  const services = [
    { name: "Haircut", description: "Classic cut and style", price: 30, durationMin: 30, order: 1, isBulkHaircut: true },
    { name: "Ceremonial Haircut", description: "Premium cut for special occasions", price: 60, durationMin: 60, order: 2 },
    { name: "Child", description: "Kids haircut (under 12)", price: 25, durationMin: 25, order: 3, isBulkHaircut: true },
    { name: "Haircut + Beard", description: "Full cut and beard service", price: 45, durationMin: 45, order: 4, isBulkHaircut: true },
  ];

  for (const svc of services) {
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    if (!existing) {
      await prisma.service.create({ data: svc });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
