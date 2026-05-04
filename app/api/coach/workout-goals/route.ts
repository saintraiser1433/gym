import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

/** Catalog of workout goals (from admin) for coaches assigning goals to clients. */
export async function GET() {
  await requireCoach();
  const goals = await prisma.workoutGoal.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: goals });
}
