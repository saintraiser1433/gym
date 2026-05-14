import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { isClientGoalsManagedByCoach } from "@/lib/client-goals-access";

export async function GET() {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const coachManagedGoals = await isClientGoalsManagedByCoach(userId);

  if (!profile) {
    return NextResponse.json({ data: [], coachManagedGoals });
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
    coachManagedGoals,
  });
}

/**
 * Self-assignment of goals is disabled.
 * Goals are managed exclusively by the coach or admin.
 */
export async function POST() {
  await requireClient();
  return NextResponse.json(
    {
      error:
        "Clients can no longer set their own goals. Please contact your coach or the gym admin.",
    },
    { status: 403 },
  );
}

