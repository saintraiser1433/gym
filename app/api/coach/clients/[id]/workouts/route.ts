import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { resolveClientGoalWorkoutLinks } from "@/lib/client-goal-workouts";

type Params = { params: Promise<{ id: string }> };

function parsePlanDayParam(day: string | null): number | null {
  if (!day?.trim()) return null;
  const m = /^day-(\d+)$/i.exec(day.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > 366) return null;
  return n;
}

/** Get workouts linked to this client's goals (catalog or coach custom plan). */
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
    goalIdParam && clientGoals.some((cg) => cg.goalId === goalIdParam)
      ? clientGoals.filter((cg) => cg.goalId === goalIdParam)
      : clientGoals;

  const usePlanDayFilter =
    planDayFilter != null &&
    goalIdParam != null &&
    filterGoals.length === 1 &&
    filterGoals[0].goalId === goalIdParam;

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

  return NextResponse.json({ data });
}
