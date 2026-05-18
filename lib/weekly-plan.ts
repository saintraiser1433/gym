import {
  type GoalCategory,
  type WorkoutPlanRow,
  weeklyWorkoutPlan,
} from "@/lib/bmr";

export type WeeklyPlanRow = WorkoutPlanRow & {
  workoutId: string | null;
  workoutIds: string[];
  source: "catalog" | "recommended" | "unscheduled";
};

export type WeeklyPlanResult = {
  source: "catalog" | "recommended" | "mixed";
  goalId: string | null;
  goalName: string | null;
  planMode?: "CATALOG" | "CUSTOM" | null;
  rows: WeeklyPlanRow[];
};

export const PLAN_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const WORKOUT_INTENSITY_OPTIONS = [
  "Low",
  "Medium",
  "High",
] as const;

export type WorkoutIntensityOption = (typeof WORKOUT_INTENSITY_OPTIONS)[number];

export function planDayLabel(planDay: number): string {
  if (planDay >= 1 && planDay <= 7) return PLAN_DAY_LABELS[planDay - 1];
  return `Day ${planDay}`;
}

export function difficultyToIntensity(difficulty: string | null | undefined): string {
  if (!difficulty?.trim()) return "Medium";
  const d = difficulty.trim();
  const lower = d.toLowerCase();
  if (lower.includes("beginner") || lower.includes("low") || lower.includes("easy")) return "Low";
  if (lower.includes("advanced") || lower.includes("high") || lower.includes("hard")) return "High";
  return d;
}

/** Default intensity when coach picks a workout in the plan editor (client-safe). */
export function intensityFromWorkoutDifficulty(
  difficulty: string | null | undefined,
): string {
  return difficultyToIntensity(difficulty) || "Medium";
}

export function nutritionToGoalCategory(
  objective: string | null | undefined,
): GoalCategory | null {
  if (!objective) return null;
  if (objective === "WEIGHT_LOSS" || objective === "SLIMMING") return "WEIGHT_LOSS";
  if (objective === "MUSCLE_GAIN") return "MUSCLE_GAIN";
  if (objective === "ENDURANCE") return "ENDURANCE";
  if (objective === "FLEXIBILITY") return "FLEXIBILITY";
  if (objective === "GENERAL_FITNESS" || objective === "MAINTENANCE") return "GENERAL_FITNESS";
  return null;
}

type CatalogLink = {
  planDay: number;
  intensity?: string | null;
  workout: {
    id: string;
    name: string;
    difficulty: string | null;
    types: string | null;
  };
};

function resolveLinkIntensity(link: CatalogLink): string {
  const custom = link.intensity?.trim();
  if (custom) return custom;
  return difficultyToIntensity(link.workout.difficulty);
}

/** Merge admin catalog goal workouts (by plan day) with BMR recommendations for empty days. */
export function buildWeeklyPlan(input: {
  catalogLinks: CatalogLink[];
  nutritionObjective: string | null;
  bmi: number | null;
  goalId: string | null;
  goalName: string | null;
  /** When false (coach custom plan), empty days stay unscheduled instead of BMR filler. */
  fillEmptyDaysWithRecommendations?: boolean;
}): WeeklyPlanResult {
  const fillEmptyDays = input.fillEmptyDaysWithRecommendations !== false;
  const goalCategory = nutritionToGoalCategory(input.nutritionObjective);
  const recommended = weeklyWorkoutPlan(goalCategory, input.bmi);

  const byDay = new Map<number, CatalogLink[]>();
  for (const link of input.catalogLinks) {
    const day = link.planDay;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(link);
  }

  const catalogDays = [...byDay.keys()];
  const useCatalog = catalogDays.length > 0;

  const maxDay = useCatalog
    ? fillEmptyDays
      ? Math.max(7, ...catalogDays, ...recommended.map((r) => r.planDay))
      : Math.max(7, ...catalogDays)
    : 7;

  const dayRange = Array.from({ length: maxDay }, (_, i) => i + 1);

  let hasCatalog = false;
  let hasRecommended = false;

  const rows: WeeklyPlanRow[] = dayRange.map((planDay) => {
    const catalog = byDay.get(planDay);
    const rec = recommended.find((r) => r.planDay === planDay);

    if (catalog?.length) {
      hasCatalog = true;
      const workoutIds = catalog.map((c) => c.workout.id);
      const type = catalog.map((c) => c.workout.name).join(" + ");
      const intensity =
        catalog.length === 1
          ? resolveLinkIntensity(catalog[0])
          : catalog
              .map((c) => resolveLinkIntensity(c))
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(" / ") || "Medium";

      return {
        day: planDayLabel(planDay),
        planDay,
        type,
        intensity,
        workoutId: workoutIds[0] ?? null,
        workoutIds,
        source: "catalog" as const,
      };
    }

    if (!fillEmptyDays) {
      return {
        day: planDayLabel(planDay),
        planDay,
        type: "Not scheduled",
        intensity: "—",
        workoutId: null,
        workoutIds: [],
        source: "unscheduled" as const,
      };
    }

    if (rec) {
      hasRecommended = true;
      return {
        ...rec,
        day: planDayLabel(planDay),
        planDay,
        workoutId: null,
        workoutIds: [],
        source: "recommended" as const,
      };
    }

    return {
      day: planDayLabel(planDay),
      planDay,
      type: "Rest",
      intensity: "Low",
      workoutId: null,
      workoutIds: [],
      source: "recommended" as const,
    };
  });

  const source: WeeklyPlanResult["source"] = hasCatalog
    ? hasRecommended
      ? "mixed"
      : "catalog"
    : "recommended";

  return {
    source,
    goalId: input.goalId,
    goalName: input.goalName,
    rows: useCatalog ? rows : recommended.map((r) => ({
      ...r,
      workoutId: null,
      workoutIds: [],
      source: "recommended" as const,
    })),
  };
}
