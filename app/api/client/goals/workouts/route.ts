import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Get workouts linked to the client's goals. Optional ?goalId= to filter by one goal. */
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

  const workouts = await prisma.workout.findMany({
    where: {
      goals: {
        some: { id: { in: filterGoalIds } },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      duration: true,
      difficulty: true,
      demoMediaUrl: true,
      goals: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: workouts });
}
