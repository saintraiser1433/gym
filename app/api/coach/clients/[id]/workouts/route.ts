import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** Get workouts linked to this client's goals. Coach must own the client. Optional ?goalId= */
export async function GET(req: NextRequest, { params }: Params) {
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;
  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id: (await params).id, assignedCoachId: coach.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found", data: [] }, { status: 404 });
  }

  const goalIdParam = new URL(req.url).searchParams.get("goalId")?.trim() || null;

  const clientGoals = await prisma.clientGoal.findMany({
    where: { clientId: client.id },
    select: { goalId: true },
  });
  const goalIds = clientGoals.map((cg) => cg.goalId);
  if (goalIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const filterGoalIds = goalIdParam && goalIds.includes(goalIdParam) ? [goalIdParam] : goalIds;

  const links = await prisma.goalWorkout.findMany({
    where: { goalId: { in: filterGoalIds } },
    select: { workoutId: true, goal: { select: { id: true, name: true } } },
  });
  const workoutIds = [...new Set(links.map((l) => l.workoutId))];
  if (workoutIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const [workouts, equipmentRows] = await Promise.all([
    prisma.workout.findMany({
      where: { id: { in: workoutIds } },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        difficulty: true,
        demoMediaUrl: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.workoutEquipment.findMany({
      where: { workoutId: { in: workoutIds } },
      select: {
        workoutId: true,
        quantity: true,
        targetKg: true,
        targetPcs: true,
        equipment: { select: { name: true } },
      },
    }),
  ]);

  const goalsByWorkoutId = links.reduce(
    (acc, l) => {
      if (!acc[l.workoutId]) acc[l.workoutId] = [];
      acc[l.workoutId].push(l.goal);
      return acc;
    },
    {} as Record<string, { id: string; name: string }[]>,
  );

  const equipmentByWorkoutId = equipmentRows.reduce(
    (acc, row) => {
      if (!acc[row.workoutId]) acc[row.workoutId] = [];
      acc[row.workoutId].push({
        equipmentName: row.equipment.name,
        quantity: row.quantity,
        targetKg: row.targetKg ?? undefined,
        targetPcs: row.targetPcs ?? undefined,
      });
      return acc;
    },
    {} as Record<string, { equipmentName: string; quantity: number; targetKg?: number; targetPcs?: number }[]>,
  );

  const data = workouts.map((w) => ({
    ...w,
    goals: goalsByWorkoutId[w.id] ?? [],
    equipment: equipmentByWorkoutId[w.id] ?? [],
  }));

  return NextResponse.json({ data });
}
