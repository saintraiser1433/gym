import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateGoalSchema } from "@/lib/validators/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const json = await req.json();
  const parsed = updateGoalSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data as {
    name?: string;
    description?: string;
    category?: string;
    targetSessions?: number | null;
    workoutIds?: string[];
    goalWorkouts?: { workoutId: string; workoutType: string; targetValue?: number | null; planDay?: number }[];
  };
  const { workoutIds, goalWorkouts: goalWorkoutsInput, ...rest } = body;
  const hasWorkoutIds = Object.prototype.hasOwnProperty.call(json, "workoutIds");
  const hasGoalWorkouts = Object.prototype.hasOwnProperty.call(json, "goalWorkouts");

  try {
    const updateData: Record<string, unknown> = { ...rest };
    const goal = await prisma.workoutGoal.update({
      where: { id },
      data: updateData,
    });

    // Sync goal workouts when the request included workoutIds or goalWorkouts (use raw key so we never skip)
    if (hasGoalWorkouts && goalWorkoutsInput !== undefined) {
      await prisma.goalWorkout.deleteMany({ where: { goalId: id } });
      if (Array.isArray(goalWorkoutsInput) && goalWorkoutsInput.length > 0) {
        const workoutType = (t: string) => (t === "PER_KG" ? "PER_KG" as const : "PER_PCS" as const);
        await prisma.goalWorkout.createMany({
          data: goalWorkoutsInput
            .filter((gw) => gw.workoutId && gw.workoutType)
            .map((gw) => ({
              goalId: id,
              workoutId: gw.workoutId,
              workoutType: workoutType(gw.workoutType),
              targetValue: gw.targetValue ?? null,
              planDay: gw.planDay ?? 1,
            })),
        });
      }
    } else if (hasWorkoutIds) {
      const ids = Array.isArray(workoutIds) ? workoutIds : [];
      await prisma.goalWorkout.deleteMany({ where: { goalId: id } });
      if (ids.length > 0) {
        await prisma.goalWorkout.createMany({
          data: ids.map((workoutId) => ({
            goalId: id,
            workoutId,
            workoutType: "PER_PCS" as const,
            targetValue: null,
            planDay: 1,
          })),
        });
      }
    }

    const goalWithWorkouts = await prisma.workoutGoal.findUnique({
      where: { id },
      include: {
        goalWorkouts: {
          include: { workout: { select: { id: true, name: true } } },
        },
      },
    });
    const goalWorkouts = (goalWithWorkouts?.goalWorkouts ?? []).map((gw) => ({
      id: gw.workout.id,
      name: gw.workout.name,
      workoutType: gw.workoutType,
      targetValue: gw.targetValue,
      planDay: gw.planDay,
    }));
    return NextResponse.json({
      ...goal,
      goalWorkouts,
      workouts: goalWorkouts.map((w) => ({ id: w.id, name: w.name, planDay: w.planDay })),
    });
  } catch {
    return NextResponse.json(
      { error: "Goal not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  try {
    await prisma.workoutGoal.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Goal not found" },
      { status: 404 },
    );
  }
}

