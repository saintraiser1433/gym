import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

/** Workouts a coach can attach to a client goal (admin catalog + coach-created). */
export async function GET() {
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json({ data: [] });
  }

  const workouts = await prisma.workout.findMany({
    where: {
      OR: [{ createdById: null }, { createdById: coach.id }],
    },
    select: {
      id: true,
      name: true,
      difficulty: true,
      types: true,
      createdById: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    data: workouts.map((w) => ({
      id: w.id,
      name: w.name,
      difficulty: w.difficulty,
      types: w.types,
      source: w.createdById ? ("coach" as const) : ("catalog" as const),
    })),
  });
}
