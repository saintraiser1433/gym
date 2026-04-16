import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { notifyCoach } from "@/lib/notifications";

export async function GET() {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ data: [] });
  }

  const goals = await prisma.clientGoal.findMany({
    where: { clientId: profile.id },
    include: { goal: true },
    orderBy: { deadline: "asc" },
  });

  const data = await Promise.all(
    goals.map(async (cg) => {
      const updates = await prisma.clientGoalUpdate.findMany({
        where: { clientGoalId: cg.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, message: true, createdAt: true },
      });
      if (cg.targetSessions == null) return { ...cg, updates };
      const links = await prisma.goalWorkout.findMany({
        where: { goalId: cg.goalId },
        select: { workoutId: true },
      });
      const workoutIds = links.map((l) => l.workoutId);
      const weIds = (
        await prisma.workoutExercise.findMany({
          where: { workoutId: { in: workoutIds } },
          select: { id: true },
        })
      ).map((e) => e.id);
      const count = await prisma.workoutProgress.count({
        where: {
          clientId: profile.id,
          OR: [
            ...(weIds.length > 0 ? [{ workoutExerciseId: { in: weIds } }] : []),
            { workoutId: { in: workoutIds } },
          ],
        },
      });
      return { ...cg, currentValue: count, updates };
    }),
  );

  return NextResponse.json({
    data: data.map((cg) => ({
      ...cg,
      updates: (cg as { updates?: { id: string; message: string; createdAt: Date }[] }).updates ?? [],
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;
  const body = await req.json();

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    include: { user: { select: { name: true } } },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Client profile not found" },
      { status: 404 },
    );
  }

  const goalRecord = await prisma.workoutGoal.findUnique({
    where: { id: body.goalId },
  });
  if (!goalRecord) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  const targetSessionsFromGoal = (goalRecord as { targetSessions?: number | null }).targetSessions ?? null;

  const deadline = body.deadline ? new Date(body.deadline) : null;
  if (deadline) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (deadline < startOfToday) {
      return NextResponse.json(
        { error: "Deadline must be today or a future date, not a past date." },
        { status: 400 },
      );
    }
  }

  const goal = await prisma.clientGoal.create({
    data: {
      clientId: profile.id,
      goalId: body.goalId,
      targetValue: body.targetValue ?? null,
      targetSessions: targetSessionsFromGoal,
      deadline,
    },
    include: { goal: { select: { name: true } } },
  });

  if (profile.assignedCoachId) {
    const clientName = profile.user?.name ?? "A client";
    await notifyCoach(
      profile.assignedCoachId,
      "CLIENT_GOAL_SET",
      "Client set a goal",
      `${clientName} set a new goal${goal.goal?.name ? `: ${goal.goal.name}` : ""}.`,
      { clientId: profile.id, goalId: goal.id },
    );
  }

  return NextResponse.json(goal, { status: 201 });
}

