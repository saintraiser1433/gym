import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import {
  normalizeCustomWorkoutsForDb,
  parseCustomWorkouts,
} from "@/lib/client-goal-workouts";

type Params = { params: Promise<{ id: string }> };

/** Coach assigns a workout goal from the catalog to this client. */
export async function POST(req: Request, { params }: Params) {
  const { id: clientId } = await params;
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id: clientId, assignedCoachId: coach.id },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let body: {
    goalId?: string;
    targetValue?: number | null;
    targetSessions?: number | null;
    deadline?: string | null;
    workoutPlanMode?: string;
    customWorkouts?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.goalId || typeof body.goalId !== "string") {
    return NextResponse.json({ error: "goalId is required" }, { status: 400 });
  }

  const workoutPlanMode =
    body.workoutPlanMode === "CUSTOM" ? "CUSTOM" : ("CATALOG" as const);
  const customRows = parseCustomWorkouts(body.customWorkouts);
  if (workoutPlanMode === "CUSTOM" && customRows.length === 0) {
    return NextResponse.json(
      { error: "Add at least one workout for a custom plan, or use catalog defaults." },
      { status: 400 },
    );
  }

  const goalRecord = await prisma.workoutGoal.findUnique({
    where: { id: body.goalId },
  });
  if (!goalRecord) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const dup = await prisma.clientGoal.findFirst({
    where: { clientId, goalId: body.goalId },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ error: "This goal is already assigned to the client." }, { status: 409 });
  }

  const defaultSessions = goalRecord.targetSessions ?? null;
  const isSessionStyle = defaultSessions != null;
  const resolvedTargetSessions =
    body.targetSessions !== undefined && body.targetSessions !== null
      ? Number(body.targetSessions)
      : defaultSessions;
  const resolvedTargetValue =
    body.targetValue !== undefined && body.targetValue !== null ? Number(body.targetValue) : null;

  const deadline = body.deadline ? new Date(body.deadline) : null;
  if (deadline) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (deadline < startOfToday) {
      return NextResponse.json(
        { error: "Deadline must be today or a future date." },
        { status: 400 },
      );
    }
  }

  const created = await prisma.clientGoal.create({
    data: {
      clientId,
      goalId: body.goalId,
      targetValue: isSessionStyle ? null : resolvedTargetValue,
      targetSessions: isSessionStyle ? resolvedTargetSessions : null,
      deadline,
      workoutPlanMode,
      ...(workoutPlanMode === "CUSTOM"
        ? {
            customWorkouts: {
              create: normalizeCustomWorkoutsForDb(customRows),
            },
          }
        : {}),
    },
    include: {
      goal: { select: { name: true, category: true } },
      customWorkouts: {
        include: { workout: { select: { id: true, name: true } } },
        orderBy: [{ planDay: "asc" }],
      },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
