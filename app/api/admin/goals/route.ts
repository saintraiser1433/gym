import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createGoalSchema,
  paginationSchema,
} from "@/lib/validators/admin";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    search: url.searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params" },
      { status: 400 },
    );
  }

  const { page, pageSize, search } = parsed.data;
  const where = search
    ? {
        name: { contains: search, mode: "insensitive" as const },
      }
    : {};

  const [total, goalsRows] = await Promise.all([
    prisma.workoutGoal.count({ where }),
    prisma.workoutGoal.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        goalWorkouts: {
          include: {
            workout: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const goals = goalsRows.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    category: g.category,
    targetSessions: (g as { targetSessions?: number | null }).targetSessions ?? null,
    goalWorkouts: g.goalWorkouts.map((gw) => ({
      id: gw.workout.id,
      name: gw.workout.name,
      workoutType: gw.workoutType,
      targetValue: gw.targetValue,
    })),
    workouts: g.goalWorkouts.map((gw) => ({ id: gw.workout.id, name: gw.workout.name })),
  }));
  return NextResponse.json({ data: goals, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createGoalSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { goalWorkouts: goalWorkoutsInput = [], workoutIds = [], name, description, category, targetSessions } = parsed.data;

  const goal = await prisma.workoutGoal.create({
    data: {
      name,
      description: description ?? undefined,
      category,
      ...(targetSessions != null && { targetSessions }),
    },
  });

  const toInsert =
    Array.isArray(goalWorkoutsInput) && goalWorkoutsInput.length > 0
      ? goalWorkoutsInput.map((gw: any) => ({
          workoutId: gw.workoutId,
          workoutType: gw.workoutType === "PER_KG" ? "PER_KG" : "PER_PCS",
          targetValue: gw.targetValue ?? null,
        }))
      : (workoutIds as string[]).map((workoutId) => ({ workoutId, workoutType: "PER_PCS" as const, targetValue: null }));

  if (toInsert.length > 0) {
    const { randomUUID } = await import("crypto");
    for (const gw of toInsert) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "GoalWorkout" (id, "goalId", "workoutId", "workoutType", "targetValue") VALUES ($1, $2, $3, $4::"WorkoutType", $5)`,
        randomUUID(),
        goal.id,
        gw.workoutId,
        gw.workoutType,
        gw.targetValue ?? null,
      );
    }
  }

  const gwRows = await prisma.$queryRawUnsafe<{ workoutId: string; workoutType: string; targetValue: number | null; name: string }[]>(
    `SELECT gw."workoutId", gw."workoutType", gw."targetValue", w.name FROM "GoalWorkout" gw JOIN "Workout" w ON w.id = gw."workoutId" WHERE gw."goalId" = $1`,
    goal.id,
  );
  const goalWorkouts = gwRows.map((r) => ({ id: r.workoutId, name: r.name, workoutType: r.workoutType, targetValue: r.targetValue }));
  return NextResponse.json({ ...goal, goalWorkouts, workouts: goalWorkouts.map((w) => ({ id: w.id, name: w.name })) }, { status: 201 });
}

