import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: Promise<{ id: string; workoutId: string }> };

/** Get workout exercises for this client (for coach to log session). */
export async function GET(_req: Request, { params }: Params) {
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;
  const { id: clientId, workoutId } = await params;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id: clientId, assignedCoachId: coach.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found", data: [] }, { status: 404 });
  }

  const clientGoals = await prisma.clientGoal.findMany({
    where: { clientId: client.id },
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
    return NextResponse.json({ error: "Workout not in client goals", data: [] }, { status: 404 });
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
