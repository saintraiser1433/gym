import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

function parsePlanDayParam(day: string | null): number | null {
  if (!day?.trim()) return null;
  const m = /^day-(\d+)$/i.exec(day.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > 366) return null;
  return n;
}

/** Get workouts linked to the client's goals. Optional ?goalId= to filter by one goal. Optional ?day=day-3 with goalId to filter by plan day (GoalWorkout.planDay). */
export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }
  const userId = (session.user as any).id as string;
  const { searchParams } = new URL(req.url);
  const goalId = searchParams.get("goalId")?.trim() || null;
  const planDayFilter = parsePlanDayParam(searchParams.get("day"));

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

  const filterGoalIds = goalId && goalIds.includes(goalId) ? [goalId] : goalIds;
  const selectedGoalId = goalId && filterGoalIds.length === 1 ? filterGoalIds[0] : null;
  const goalPlan = selectedGoalId
    ? await prisma.goalWorkout.findMany({
        where: { goalId: selectedGoalId },
        select: { planDay: true },
      })
    : [];

  const usePlanDayFilter =
    planDayFilter != null &&
    goalId != null &&
    filterGoalIds.length === 1 &&
    filterGoalIds[0] === goalId;

  // Use GoalWorkout join table (database has this; no _WorkoutToWorkoutGoal)
  const links = await prisma.goalWorkout.findMany({
    where: {
      goalId: { in: filterGoalIds },
      ...(usePlanDayFilter ? { planDay: planDayFilter } : {}),
    },
    select: { workoutId: true, planDay: true, goal: { select: { id: true, name: true } } },
  });
  const workoutIds = [...new Set(links.map((l) => l.workoutId))];
  if (workoutIds.length === 0) {
    const availableDays = selectedGoalId
      ? [...new Set(goalPlan.map((l) => l.planDay))].sort((a, b) => a - b)
      : [];
    return NextResponse.json({
      data: [],
      plan: selectedGoalId
        ? {
            goalId: selectedGoalId,
            availableDays,
            maxDay: availableDays.length > 0 ? availableDays[availableDays.length - 1] : 1,
          }
        : null,
    });
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

  const planMeta = selectedGoalId
    ? {
        goalId: selectedGoalId,
        availableDays: [...new Set(goalPlan.map((l) => l.planDay))].sort((a, b) => a - b),
        maxDay: goalPlan.reduce((max, l) => (l.planDay > max ? l.planDay : max), 1),
      }
    : null;

  return NextResponse.json({ data, plan: planMeta });
}
