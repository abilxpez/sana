import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limitParam = Number(searchParams.get("limit") || 10);
  const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;

  const foods = await prisma.foodItem.findMany({
    where: q
      ? {
          name: {
            contains: q,
            mode: "insensitive",
          },
        }
      : undefined,
    orderBy: {
      name: "asc",
    },
    take,
    select: {
      id: true,
      name: true,
      caloriesPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
    },
  });

  return NextResponse.json({ foods });
}
