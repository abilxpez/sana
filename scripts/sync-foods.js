const fs = require("node:fs/promises");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

function normalizeFoodName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function syncFoods() {
  const filePath = path.join(process.cwd(), "data", "foods.jsonl");
  const raw = await fs.readFile(filePath, "utf8");

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let upserted = 0;

  for (const line of lines) {
    const parsed = JSON.parse(line);
    const name = (parsed.name || "").trim();

    if (!name) {
      continue;
    }

    await prisma.foodItem.upsert({
      where: {
        normalizedName: normalizeFoodName(name),
      },
      create: {
        name,
        normalizedName: normalizeFoodName(name),
        caloriesPer100g: Number(parsed.caloriesPer100g),
        proteinPer100g: parsed.proteinPer100g == null ? null : Number(parsed.proteinPer100g),
        carbsPer100g: parsed.carbsPer100g == null ? null : Number(parsed.carbsPer100g),
        fatPer100g: parsed.fatPer100g == null ? null : Number(parsed.fatPer100g),
      },
      update: {
        name,
        caloriesPer100g: Number(parsed.caloriesPer100g),
        proteinPer100g: parsed.proteinPer100g == null ? null : Number(parsed.proteinPer100g),
        carbsPer100g: parsed.carbsPer100g == null ? null : Number(parsed.carbsPer100g),
        fatPer100g: parsed.fatPer100g == null ? null : Number(parsed.fatPer100g),
      },
    });

    upserted += 1;
  }

  console.log(`Synced ${upserted} food item(s) from data/foods.jsonl`);
}

syncFoods()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
