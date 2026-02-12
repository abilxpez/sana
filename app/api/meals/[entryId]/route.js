import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_request, { params }) {
  const { entryId } = await params;

  if (!entryId || typeof entryId !== "string") {
    return NextResponse.json({ error: "entryId is required" }, { status: 400 });
  }

  const existingEntry = await prisma.mealEntry.findUnique({
    where: { id: entryId },
    select: { id: true, mealLogId: true },
  });

  if (!existingEntry) {
    return NextResponse.json({ error: "meal entry not found" }, { status: 404 });
  }

  await prisma.mealEntry.delete({
    where: { id: entryId },
  });

  const remainingCount = await prisma.mealEntry.count({
    where: { mealLogId: existingEntry.mealLogId },
  });

  if (remainingCount === 0) {
    await prisma.mealLog.delete({
      where: { id: existingEntry.mealLogId },
    });
  }

  return NextResponse.json({ deletedId: existingEntry.id });
}
