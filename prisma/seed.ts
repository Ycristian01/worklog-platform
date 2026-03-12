import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Administration", color: "#6366f1" },
  { name: "Engineering Operations", color: "#f59e0b" },
  { name: "New Feature/Enhancements", color: "#10b981" },
  { name: "Production Support", color: "#ef4444" },
];

async function main() {
  console.log("Seeding categories...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { color: category.color },
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
