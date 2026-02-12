import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parseDateKey(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const start = parseDateKey(searchParams.get("start"));
  const end = parseDateKey(searchParams.get("end"));

  if (!start || !end || end < start) {
    return NextResponse.json({ error: "start and end queries must be YYYY-MM-DD and end >= start" }, { status: 400 });
  }

  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const logs = await prisma.mealLog.findMany({
    where: {
      loggedFor: {
        gte: start,
        lt: endExclusive,
      },
    },
    include: {
      entries: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      loggedFor: "asc",
    },
  });

  const logsByKey = new Map(logs.map((log) => [toDateKey(log.loggedFor), log.entries]));
  const days = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dateKey = toDateKey(cursor);
    const entries = logsByKey.get(dateKey) || [];

    const totalWeight = entries.reduce((sum, item) => sum + item.weightGrams, 0);
    const totalCalories = entries.reduce((sum, item) => sum + (item.calories || 0), 0);

    days.push({
      date: dateKey,
      entries,
      totalWeight,
      totalCalories,
    });
  }

  return NextResponse.json({ days });
}
