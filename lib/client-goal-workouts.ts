import { prisma } from "@/lib/db";
import type { ClientGoalWorkoutPlanMode } from "@/lib/generated/prisma/client";
import { difficultyToIntensity } from "@/lib/weekly-plan";

export type CustomWorkoutInput = {
  workoutId: string;
  planDay: number;
  workoutType?: string;
  targetValue?: number | null;
  intensity?: string | null;
};

export type ResolvedWorkoutLink = {
  planDay: number;
  workoutId: string;
  workoutType: string;
  targetValue: number | null;
  intensity: string | null;
  workout: {
    id: string;
    name: string;
    difficulty: string | null;
    types?: string[] | null;
  };
};

function normalizeIntensity(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).trim();
  return s || null;
}

export function parseCustomWorkouts(raw: unknown): CustomWorkoutInput[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomWorkoutInput[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const workoutId = typeof r.workoutId === "string" ? r.workoutId.trim() : "";
    if (!workoutId) continue;
    const planDay = Math.max(
      1,
      Math.min(366, Number.parseInt(String(r.planDay ?? 1), 10) || 1),
    );
    const workoutType =
      r.workoutType === "PER_KG" || r.workoutType === "PER_PCS"
        ? r.workoutType
        : "PER_PCS";
    const targetValue =
      r.targetValue === null || r.targetValue === undefined || r.targetValue === ""
        ? null
        : Number(r.targetValue);
    out.push({
      workoutId,
      planDay,
      workoutType,
      targetValue: Number.isFinite(targetValue as number) ? (targetValue as number) : null,
      intensity: normalizeIntensity(r.intensity),
    });
  }
  return out
    .filter(
      (row, index, list) =>
        list.findIndex((x) => x.workoutId === row.workoutId && x.planDay === row.planDay) ===
        index,
    );
}

export function normalizeCustomWorkoutsForDb(rows: CustomWorkoutInput[]) {
  return rows.map((row) => ({
    workoutId: row.workoutId,
    planDay: row.planDay,
    workoutType: (row.workoutType === "PER_KG" ? "PER_KG" : "PER_PCS") as "PER_KG" | "PER_PCS",
    targetValue: row.targetValue ?? null,
    intensity: row.intensity?.trim() || "Medium",
  }));
}

/** Workouts for a client goal: catalog defaults or coach custom plan. */
export async function resolveClientGoalWorkoutLinks(input: {
  clientGoalId: string;
  goalId: string;
  workoutPlanMode: ClientGoalWorkoutPlanMode | string;
}): Promise<ResolvedWorkoutLink[]> {
  if (input.workoutPlanMode === "CUSTOM") {
    const links = await prisma.clientGoalWorkout.findMany({
      where: { clientGoalId: input.clientGoalId },
      select: {
        planDay: true,
        workoutId: true,
        workoutType: true,
        targetValue: true,
        intensity: true,
        workout: {
          select: {
            id: true,
            name: true,
            difficulty: true,
            types: true,
          },
        },
      },
      orderBy: [{ planDay: "asc" }, { workout: { name: "asc" } }],
    });
    return links.map((l) => ({
      planDay: l.planDay,
      workoutId: l.workoutId,
      workoutType: l.workoutType,
      targetValue: l.targetValue,
      intensity: l.intensity,
      workout: l.workout,
    }));
  }

  const links = await prisma.goalWorkout.findMany({
    where: { goalId: input.goalId },
    select: {
      planDay: true,
      workoutId: true,
      workoutType: true,
      targetValue: true,
      workout: {
        select: {
          id: true,
          name: true,
          difficulty: true,
          types: true,
        },
      },
    },
    orderBy: [{ planDay: "asc" }, { workout: { name: "asc" } }],
  });
  return links.map((l) => ({
    planDay: l.planDay,
    workoutId: l.workoutId,
    workoutType: l.workoutType,
    targetValue: l.targetValue,
    intensity: null,
    workout: l.workout,
  }));
}

export function toWeeklyPlanCatalogLinks(links: ResolvedWorkoutLink[]) {
  return links.map((l) => ({
    planDay: l.planDay,
    intensity: l.intensity,
    workout: {
      id: l.workout.id,
      name: l.workout.name,
      difficulty: l.workout.difficulty,
      types: l.workout.types?.join(",") ?? null,
    },
  }));
}
