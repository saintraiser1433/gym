import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function parsePlanDayParam(day: string | null): number | null {
  if (!day?.trim()) return null;
  const m = /^day-(\d+)$/i.exec(day.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > 366) return null;
  return n;
}

/** Get workouts linked to this client's goals. Coach must own the client. Optional ?goalId= and ?day=day-N with goalId for plan day. */
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

  const url = new URL(req.url);
  const goalIdParam = url.searchParams.get("goalId")?.trim() || null;
  const planDayFilter = parsePlanDayParam(url.searchParams.get("day"));

  const clientGoals = await prisma.clientGoal.findMany({
    where: { clientId: client.id },
    select: { goalId: true },
  });
  const goalIds = clientGoals.map((cg) => cg.goalId);
  if (goalIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const filterGoalIds = goalIdParam && goalIds.includes(goalIdParam) ? [goalIdParam] : goalIds;

  const usePlanDayFilter =
    planDayFilter != null &&
    goalIdParam != null &&
    filterGoalIds.length === 1 &&
    filterGoalIds[0] === goalIdParam;

  const links = await prisma.goalWorkout.findMany({
    where: {
      goalId: { in: filterGoalIds },
      ...(usePlanDayFilter ? { planDay: planDayFilter } : {}),
    },
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
        media: {
          select: {
            id: true,
            url: true,
            stepName: true,
            description: true,
            mediaType: true,
            durationSeconds: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
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
    media: w.media.length
      ? w.media
      : w.demoMediaUrl
        ? [
            {
              id: `legacy-${w.id}`,
              url: w.demoMediaUrl,
              stepName: null,
              description: null,
              mediaType: w.demoMediaUrl.toLowerCase().endsWith(".gif") ? "GIF" : "VIDEO",
              durationSeconds: w.duration ? w.duration * 60 : 60,
              order: 0,
            },
          ]
        : [],
    goals: goalsByWorkoutId[w.id] ?? [],
    equipment: equipmentByWorkoutId[w.id] ?? [],
  }));

  return NextResponse.json({ data });
}
