import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import {
  resolveClientGoalWorkoutLinks,
  toWeeklyPlanCatalogLinks,
} from "@/lib/client-goal-workouts";
import { buildWeeklyPlan } from "@/lib/weekly-plan";

type Params = { params: Promise<{ id: string }> };

/** Weekly workout plan from catalog goal workouts (planDay) with BMR fallback for empty days. */
export async function GET(req: NextRequest, { params }: Params) {
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;
  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id: (await params).id, assignedCoachId: coach.id },
    select: {
      id: true,
      nutritionObjective: true,
      weight: true,
      height: true,
    },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const goalIdParam = url.searchParams.get("goalId")?.trim() || null;
  const nutritionParam = url.searchParams.get("nutritionObjective")?.trim() || null;
  const bmiParam = url.searchParams.get("bmi");

  const clientGoals = await prisma.clientGoal.findMany({
    where: { clientId: client.id, status: { not: "CANCELLED" } },
    select: {
      id: true,
      goalId: true,
      workoutPlanMode: true,
      goal: { select: { id: true, name: true, category: true } },
    },
  });

  const goalIds = clientGoals.map((cg) => cg.goalId);
  const picked =
    goalIdParam && goalIds.includes(goalIdParam)
      ? clientGoals.find((cg) => cg.goalId === goalIdParam)!
      : clientGoals.find((cg) => cg.goalId) ?? null;

  let catalogLinks: {
    planDay: number;
    workout: { id: string; name: string; difficulty: string | null; types: string | null };
  }[] = [];

  if (picked) {
    const resolved = await resolveClientGoalWorkoutLinks({
      clientGoalId: picked.id,
      goalId: picked.goalId,
      workoutPlanMode: picked.workoutPlanMode,
    });
    catalogLinks = toWeeklyPlanCatalogLinks(resolved);
  }

  const catalogCategory = picked?.goal.category ?? null;
  const nutritionObjective =
    nutritionParam || catalogCategory || client.nutritionObjective || null;

  let bmi: number | null = null;
  if (bmiParam != null && bmiParam !== "") {
    const parsed = parseFloat(bmiParam);
    if (Number.isFinite(parsed)) bmi = parsed;
  } else if (client.weight != null && client.height != null && client.height > 0) {
    const m = client.height / 100;
    bmi = Math.round((client.weight / (m * m)) * 10) / 10;
  }

  const plan = buildWeeklyPlan({
    catalogLinks,
    nutritionObjective,
    bmi,
    goalId: picked?.goalId ?? null,
    goalName: picked?.goal.name ?? null,
    fillEmptyDaysWithRecommendations: picked?.workoutPlanMode !== "CUSTOM",
  });

  return NextResponse.json({ data: plan });
}
