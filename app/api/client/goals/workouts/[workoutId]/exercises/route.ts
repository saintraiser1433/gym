import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

type Context = { params: Promise<{ workoutId: string }> };

/** Get workout exercises for a goal workout (so client can pick one when logging progress). */
export async function GET(req: NextRequest, context: Context) {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const { workoutId } = await context.params;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ data: [] });
  }

  const clientGoals = await prisma.clientGoal.findMany({
    where: { clientId: profile.id },
    select: { goalId: true },
  });
  const goalIds = clientGoals.map((cg) => cg.goalId);
  if (goalIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const links = await prisma.goalWorkout.findMany({
    where: { goalId: { in: goalIds }, workoutId },
    select: { workoutId: true },
  });
  if (links.length === 0) {
    return NextResponse.json({ error: "Workout not in your goals", data: [] }, { status: 404 });
  }

  const exercises = await prisma.workoutExercise.findMany({
    where: { workoutId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      exercise: { select: { name: true } },
    },
  });

  const data = exercises.map((e) => ({
    id: e.id,
    name: e.exercise.name,
  }));

  return NextResponse.json({ data });
}
