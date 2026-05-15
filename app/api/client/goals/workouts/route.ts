import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { resolveClientGoalWorkoutLinks } from "@/lib/client-goal-workouts";

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
    select: {
      id: true,
      goalId: true,
      workoutPlanMode: true,
      goal: { select: { id: true, name: true } },
    },
  });
  if (clientGoals.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const filterGoals =
    goalId && clientGoals.some((cg) => cg.goalId === goalId)
      ? clientGoals.filter((cg) => cg.goalId === goalId)
      : clientGoals;
  const selectedGoalId =
    goalId && filterGoals.length === 1 && filterGoals[0].goalId === goalId
      ? goalId
      : null;

  const usePlanDayFilter =
    planDayFilter != null &&
    goalId != null &&
    filterGoals.length === 1 &&
    filterGoals[0].goalId === goalId;

  const linkRows: {
    workoutId: string;
    planDay: number;
    goal: { id: string; name: string };
  }[] = [];

  for (const cg of filterGoals) {
    const resolved = await resolveClientGoalWorkoutLinks({
      clientGoalId: cg.id,
      goalId: cg.goalId,
      workoutPlanMode: cg.workoutPlanMode,
    });
    for (const link of resolved) {
      if (usePlanDayFilter && link.planDay !== planDayFilter) continue;
      linkRows.push({
        workoutId: link.workoutId,
        planDay: link.planDay,
        goal: cg.goal,
      });
    }
  }

  const workoutIds = [...new Set(linkRows.map((l) => l.workoutId))];
  const goalPlanDays = linkRows.map((l) => l.planDay);

  if (workoutIds.length === 0) {
    const availableDays = selectedGoalId
      ? [...new Set(goalPlanDays)].sort((a, b) => a - b)
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

  const goalsByWorkoutId = linkRows.reduce(
    (acc, l) => {
      if (!acc[l.workoutId]) acc[l.workoutId] = [];
      const exists = acc[l.workoutId].some((g) => g.id === l.goal.id);
      if (!exists) acc[l.workoutId].push(l.goal);
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
        availableDays: [...new Set(goalPlanDays)].sort((a, b) => a - b),
        maxDay: goalPlanDays.reduce((max, d) => (d > max ? d : max), 1),
      }
    : null;

  return NextResponse.json({ data, plan: planMeta });
}
