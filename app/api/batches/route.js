import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateCalories, normalizeFoodName } from "@/lib/nutrition";

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toNonNegativeNumber(value) {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function GET() {
  const batches = await prisma.batchCook.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ batches });
}

export async function POST(request) {
  const body = await request.json();
  const { name, servings, items } = body;

  const batchName = typeof name === "string" && name.trim() ? name.trim() : null;
  if (!batchName) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must contain at least one ingredient" }, { status: 400 });
  }

  const parsedServings = servings == null || `${servings}`.trim() === "" ? null : toPositiveNumber(servings);
  if (servings != null && `${servings}`.trim() !== "" && parsedServings == null) {
    return NextResponse.json({ error: "servings must be a positive number" }, { status: 400 });
  }

  const normalizedNames = [];
  const validatedItems = [];

  for (const item of items) {
    const foodName = typeof item.foodName === "string" ? item.foodName.trim() : "";
    const weightGrams = toPositiveNumber(item.weightGrams);

    if (!foodName || weightGrams == null) {
      return NextResponse.json({ error: "each item requires foodName and positive weightGrams" }, { status: 400 });
    }

    const overrideCalories = toNonNegativeNumber(item.caloriesOverride);
    if (item.caloriesOverride != null && `${item.caloriesOverride}`.trim() !== "" && overrideCalories == null) {
      return NextResponse.json({ error: "caloriesOverride must be a non-negative number" }, { status: 400 });
    }

    const normalizedName = normalizeFoodName(foodName);
    normalizedNames.push(normalizedName);
    validatedItems.push({
      foodName,
      weightGrams,
      overrideCalories,
      normalizedName,
    });
  }

  const uniqueNames = Array.from(new Set(normalizedNames));
  const matchedFoods = await prisma.foodItem.findMany({
    where: {
      normalizedName: {
        in: uniqueNames,
      },
    },
    select: {
      id: true,
      normalizedName: true,
      caloriesPer100g: true,
    },
  });
  const foodsByName = new Map(matchedFoods.map((food) => [food.normalizedName, food]));

  const preparedItems = [];

  for (const item of validatedItems) {
    const matchedFood = foodsByName.get(item.normalizedName);

    let calories = null;
    let caloriesSource = "unmatched";

    if (item.overrideCalories != null) {
      calories = item.overrideCalories;
      caloriesSource = "override";
    } else if (matchedFood) {
      calories = calculateCalories(item.weightGrams, matchedFood.caloriesPer100g);
      caloriesSource = "dataset";
    }

    preparedItems.push({
      foodName: item.foodName,
      weightGrams: item.weightGrams,
      calories,
      caloriesSource,
      foodItemId: matchedFood?.id || null,
    });
  }

  const totalWeightGrams = preparedItems.reduce((sum, item) => sum + item.weightGrams, 0);
  const totalCalories = preparedItems.reduce((sum, item) => sum + (item.calories || 0), 0);

  const createdBatch = await prisma.batchCook.create({
    data: {
      name: batchName,
      servings: parsedServings ? Math.round(parsedServings) : null,
      totalWeightGrams,
      totalCalories,
      items: {
        create: preparedItems,
      },
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ batch: createdBatch }, { status: 201 });
}
