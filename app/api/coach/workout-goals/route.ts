import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

/** Catalog of workout goals (from admin) for coaches assigning goals to clients. */
export async function GET() {
  await requireCoach();
  const goals = await prisma.workoutGoal.findMany({
    orderBy: { name: "asc" },
    include: {
      goalWorkouts: {
        include: { workout: { select: { id: true, name: true, difficulty: true } } },
        orderBy: [{ planDay: "asc" }, { workout: { name: "asc" } }],
      },
    },
  });
  return NextResponse.json({
    data: goals.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      category: g.category,
      targetSessions: g.targetSessions,
      defaultWorkouts: g.goalWorkouts.map((gw) => ({
        workoutId: gw.workoutId,
        name: gw.workout.name,
        planDay: gw.planDay,
        workoutType: gw.workoutType,
        targetValue: gw.targetValue,
        difficulty: gw.workout.difficulty,
      })),
    })),
  });
}
