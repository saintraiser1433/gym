import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

export async function GET() {
  await requireClient();

  const goals = await prisma.workoutGoal.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: goals });
}

