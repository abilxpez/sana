import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateCalories, getUtcDayRange, normalizeFoodName } from "@/lib/nutrition";

const VALID_CATEGORIES = new Set(["lunch", "dinner", "snacks"]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date query must be YYYY-MM-DD" }, { status: 400 });
  }

  const { start } = getUtcDayRange(date);

  const mealLog = await prisma.mealLog.findUnique({
    where: {
      loggedFor: start,
    },
    include: {
      entries: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return NextResponse.json({ entries: mealLog?.entries || [] });
}

export async function POST(request) {
  const body = await request.json();
  const { foodName, weightGrams, category, date, caloriesOverride, entryType, batchCookId } = body;
  const normalizedEntryType = entryType === "batch" ? "batch" : "food";

  const parsedWeight = Number(weightGrams);
  if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
    return NextResponse.json({ error: "weightGrams must be a positive number" }, { status: 400 });
  }

  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date is required in YYYY-MM-DD format" }, { status: 400 });
  }

  const { start } = getUtcDayRange(date);
  let resolvedFoodName = "";
  let resolvedCalories = null;
  let resolvedFoodItemId = null;
  let resolvedBatchCookId = null;

  if (normalizedEntryType === "food") {
    if (!foodName || typeof foodName !== "string") {
      return NextResponse.json({ error: "foodName is required" }, { status: 400 });
    }

    const normalizedName = normalizeFoodName(foodName);
    const overrideProvided = caloriesOverride !== undefined && caloriesOverride !== null && `${caloriesOverride}`.trim() !== "";
    const parsedOverride = overrideProvided ? Number(caloriesOverride) : null;
    if (overrideProvided && (!Number.isFinite(parsedOverride) || parsedOverride < 0)) {
      return NextResponse.json({ error: "caloriesOverride must be a non-negative number" }, { status: 400 });
    }

    const foodItem = await prisma.foodItem.findUnique({
      where: { normalizedName },
      select: { id: true, caloriesPer100g: true },
    });

    resolvedFoodName = foodName.trim();
    resolvedFoodItemId = foodItem?.id || null;
    resolvedCalories = overrideProvided ? parsedOverride : foodItem ? calculateCalories(parsedWeight, foodItem.caloriesPer100g) : null;
  }

  if (normalizedEntryType === "batch") {
    if (!batchCookId || typeof batchCookId !== "string") {
      return NextResponse.json({ error: "batchCookId is required for batch entries" }, { status: 400 });
    }

    const batch = await prisma.batchCook.findUnique({
      where: { id: batchCookId },
      select: {
        id: true,
        name: true,
        totalCalories: true,
        totalWeightGrams: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "batch cook not found" }, { status: 404 });
    }
    if (!Number.isFinite(batch.totalWeightGrams) || batch.totalWeightGrams <= 0) {
      return NextResponse.json({ error: "batch cook has invalid total weight" }, { status: 400 });
    }

    const caloriesPerGram = batch.totalCalories / batch.totalWeightGrams;
    resolvedCalories = Number((parsedWeight * caloriesPerGram).toFixed(2));
    resolvedFoodName = `${batch.name} (Batch)`;
    resolvedBatchCookId = batch.id;
  }

  const mealLog = await prisma.mealLog.upsert({
    where: {
      loggedFor: start,
    },
    update: {},
    create: {
      loggedFor: start,
    },
    select: { id: true },
  });

  const createdEntry = await prisma.mealEntry.create({
    data: {
      mealLogId: mealLog.id,
      foodItemId: resolvedFoodItemId,
      batchCookId: resolvedBatchCookId,
      foodName: resolvedFoodName,
      weightGrams: parsedWeight,
      calories: resolvedCalories,
      category,
    },
  });

  return NextResponse.json({ entry: createdEntry }, { status: 201 });
}
