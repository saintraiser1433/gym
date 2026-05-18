/**
 * BMR / TDEE / macro recommendation utilities.
 *
 * Based on the handwritten "App Logic" spec:
 *  - Mifflin-St Jeor BMR formula
 *  - Activity-level multipliers for TDEE
 *  - Goal-based macro targets (protein g/kg BW, carbs %, fats %)
 *  - Goal -> recommended workout type + frequency + intensity
 */

export type Gender = "Male" | "Female" | "Other" | "Prefer not to say" | string;

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "VERY_ACTIVE";

export type GoalCategory =
  | "WEIGHT_LOSS"
  | "MUSCLE_GAIN"
  | "ENDURANCE"
  | "FLEXIBILITY"
  | "GENERAL_FITNESS";

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; multiplier: number }[] = [
  { value: "SEDENTARY", label: "Sedentary (little or no exercise)", multiplier: 1.2 },
  { value: "LIGHT", label: "Lightly active (1-3 days / week)", multiplier: 1.375 },
  { value: "MODERATE", label: "Moderately active (3-5 days / week)", multiplier: 1.55 },
  { value: "VERY_ACTIVE", label: "Very active (6-7 days / week)", multiplier: 1.725 },
];

function getMultiplier(level: ActivityLevel | string | null | undefined): number {
  const found = ACTIVITY_LEVELS.find((l) => l.value === level);
  return found?.multiplier ?? 1.2;
}

/**
 * Mifflin-St Jeor BMR:
 *   Men:   BMR = 10*w + 6.25*h - 5*age + 5
 *   Women: BMR = 10*w + 6.25*h - 5*age - 161
 */
export function calcBmr(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
  ageYears: number | null | undefined,
  gender: Gender | null | undefined,
): number | null {
  if (
    weightKg == null ||
    heightCm == null ||
    ageYears == null ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(ageYears) ||
    weightKg <= 0 ||
    heightCm <= 0 ||
    ageYears <= 0
  ) {
    return null;
  }
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const isMale = typeof gender === "string" && gender.toLowerCase().startsWith("m");
  return Math.round(isMale ? base + 5 : base - 161);
}

export function calcTdee(bmr: number | null, activity: ActivityLevel | string | null | undefined): number | null {
  if (bmr == null || !Number.isFinite(bmr)) return null;
  return Math.round(bmr * getMultiplier(activity));
}

export function ageFromDob(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/** Approximate DOB (Jan 1) for a given age — used when coaches edit age in the goal plan. */
export function dobFromAge(age: number): string {
  const clamped = Math.min(120, Math.max(0, Math.round(age)));
  const year = new Date().getFullYear() - clamped;
  return `${year}-01-01`;
}

export type Macros = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

/**
 * Compute target macros based on goal, body weight, and TDEE.
 * Defaults (from notes):
 *   Weight loss:  P 1.8 g/kg, C 30-40% calories, F ~30% (high)
 *   Muscle gain:  P 2.2 g/kg, C 50-60% calories, F moderate (25%)
 *   Endurance:    P moderate (1.4 g/kg), C 55-65% calories, F high (30%, omega-3)
 *   Flexibility / General fitness: balanced 25/45/30
 */
export function autoMacros(
  goal: GoalCategory | string | null | undefined,
  weightKg: number | null | undefined,
  tdee: number | null | undefined,
): Macros | null {
  if (tdee == null || weightKg == null || tdee <= 0 || weightKg <= 0) return null;

  let calories = tdee;
  let proteinPerKg = 1.6;
  let carbsPct = 0.45;
  let fatPct = 0.3;

  switch (goal) {
    case "WEIGHT_LOSS":
      calories = Math.round(tdee * 0.8); // 20% deficit
      proteinPerKg = 1.8;
      carbsPct = 0.35;
      fatPct = 0.3;
      break;
    case "MUSCLE_GAIN":
      calories = Math.round(tdee * 1.1); // 10% surplus
      proteinPerKg = 2.2;
      carbsPct = 0.55;
      fatPct = 0.25;
      break;
    case "ENDURANCE":
      calories = tdee;
      proteinPerKg = 1.4;
      carbsPct = 0.6;
      fatPct = 0.3;
      break;
    case "FLEXIBILITY":
    case "GENERAL_FITNESS":
    default:
      calories = tdee;
      proteinPerKg = 1.6;
      carbsPct = 0.45;
      fatPct = 0.3;
      break;
  }

  const proteinG = Math.round(proteinPerKg * weightKg);
  const proteinCals = proteinG * 4;
  const fatG = Math.round((calories * fatPct) / 9);
  const fatCals = fatG * 9;
  const remainingForCarbs = Math.max(0, calories - proteinCals - fatCals);
  // Prefer to honor the carbs % directly, but fall back to remaining if it
  // would push macros over total calories.
  const carbsFromPct = Math.round((calories * carbsPct) / 4);
  const carbsFromRemaining = Math.round(remainingForCarbs / 4);
  const carbsG = Math.min(carbsFromPct, carbsFromRemaining);
  const fiberG = Math.max(25, Math.round((calories / 1000) * 14)); // ~14g per 1000 kcal

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
  };
}

export type WorkoutPlanRow = {
  day: string;
  /** Plan day index (Mon = 1 … Sun = 7) for goal–workout links. */
  planDay: number;
  type: string;
  intensity: string;
};

export type WorkoutRecommendation = {
  workoutType: string;
  frequency: string;
  intensity: string;
  weeklyPlan: WorkoutPlanRow[];
};

const OBESE_WEEKLY_PLAN: WorkoutPlanRow[] = [
  { day: "Mon", planDay: 1, type: "Low-impact cardio", intensity: "Low" },
  { day: "Tue", planDay: 2, type: "Strength (machines)", intensity: "Medium" },
  { day: "Wed", planDay: 3, type: "Mobility / stretch", intensity: "Low" },
  { day: "Thu", planDay: 4, type: "Low-impact cardio", intensity: "Low" },
  { day: "Fri", planDay: 5, type: "Strength (machines)", intensity: "Medium" },
  { day: "Sat", planDay: 6, type: "Walking / light activity", intensity: "Low" },
  { day: "Sun", planDay: 7, type: "Rest / Recover", intensity: "Low" },
];

const RECOMMENDATIONS: Record<string, WorkoutRecommendation> = {
  WEIGHT_LOSS: {
    workoutType: "Full Body + HIIT",
    frequency: "4-5 days / week",
    intensity: "High HR zone",
    weeklyPlan: [
      { day: "Mon", planDay: 1, type: "Strength", intensity: "Medium" },
      { day: "Tue", planDay: 2, type: "HIIT", intensity: "High" },
      { day: "Wed", planDay: 3, type: "Rest / Recover", intensity: "Low" },
      { day: "Thu", planDay: 4, type: "Strength", intensity: "Medium" },
      { day: "Fri", planDay: 5, type: "HIIT", intensity: "High" },
      { day: "Sat", planDay: 6, type: "Cardio (optional)", intensity: "Low" },
      { day: "Sun", planDay: 7, type: "Rest", intensity: "Low" },
    ],
  },
  MUSCLE_GAIN: {
    workoutType: "Split Routine (Push / Pull / Legs)",
    frequency: "3-5 days / week",
    intensity: "High resistance, low reps",
    weeklyPlan: [
      { day: "Mon", planDay: 1, type: "Push (chest / shoulders)", intensity: "High" },
      { day: "Tue", planDay: 2, type: "Pull (back / biceps)", intensity: "High" },
      { day: "Wed", planDay: 3, type: "Legs", intensity: "High" },
      { day: "Thu", planDay: 4, type: "Push", intensity: "Medium" },
      { day: "Fri", planDay: 5, type: "Pull", intensity: "Medium" },
      { day: "Sat", planDay: 6, type: "Active recovery", intensity: "Low" },
      { day: "Sun", planDay: 7, type: "Rest", intensity: "Low" },
    ],
  },
  ENDURANCE: {
    workoutType: "Steady-state Cardio + Core",
    frequency: "5+ days / week",
    intensity: "Zone 2 heart rate focus",
    weeklyPlan: [
      { day: "Mon", planDay: 1, type: "Zone 2 cardio", intensity: "Medium" },
      { day: "Tue", planDay: 2, type: "Tempo run / bike", intensity: "High" },
      { day: "Wed", planDay: 3, type: "Core + mobility", intensity: "Low" },
      { day: "Thu", planDay: 4, type: "Zone 2 cardio", intensity: "Medium" },
      { day: "Fri", planDay: 5, type: "Intervals", intensity: "High" },
      { day: "Sat", planDay: 6, type: "Long steady cardio", intensity: "Medium" },
      { day: "Sun", planDay: 7, type: "Rest / light walk", intensity: "Low" },
    ],
  },
  FLEXIBILITY: {
    workoutType: "Yoga + Pilates + Mobility",
    frequency: "Daily or 3-4 days / week",
    intensity: "Low HR, controlled tempo",
    weeklyPlan: [
      { day: "Mon", planDay: 1, type: "Yoga flow", intensity: "Low" },
      { day: "Tue", planDay: 2, type: "Pilates", intensity: "Low" },
      { day: "Wed", planDay: 3, type: "Mobility", intensity: "Low" },
      { day: "Thu", planDay: 4, type: "Yoga flow", intensity: "Low" },
      { day: "Fri", planDay: 5, type: "Pilates", intensity: "Low" },
      { day: "Sat", planDay: 6, type: "Stretch / restore", intensity: "Low" },
      { day: "Sun", planDay: 7, type: "Rest", intensity: "Low" },
    ],
  },
  GENERAL_FITNESS: {
    workoutType: "Mixed: Strength + Cardio",
    frequency: "3-4 days / week",
    intensity: "Moderate",
    weeklyPlan: [
      { day: "Mon", planDay: 1, type: "Full-body strength", intensity: "Medium" },
      { day: "Tue", planDay: 2, type: "Cardio", intensity: "Medium" },
      { day: "Wed", planDay: 3, type: "Rest", intensity: "Low" },
      { day: "Thu", planDay: 4, type: "Full-body strength", intensity: "Medium" },
      { day: "Fri", planDay: 5, type: "Cardio / mobility", intensity: "Low" },
      { day: "Sat", planDay: 6, type: "Optional activity", intensity: "Low" },
      { day: "Sun", planDay: 7, type: "Rest", intensity: "Low" },
    ],
  },
};

export function goalRecommendation(
  goal: GoalCategory | string | null | undefined,
): WorkoutRecommendation | null {
  if (!goal) return null;
  return RECOMMENDATIONS[goal] ?? null;
}

/** Weekly day-by-day plan; BMI &gt; 30 uses low-impact schedule per app logic. */
export function weeklyWorkoutPlan(
  goal: GoalCategory | string | null | undefined,
  bmi: number | null | undefined,
): WorkoutPlanRow[] {
  if (bmi != null && bmi > 30) return OBESE_WEEKLY_PLAN;
  return goalRecommendation(goal)?.weeklyPlan ?? [];
}

/**
 * Convenience: when BMI > 30, the app should bias workouts toward low-impact,
 * higher-frequency cardio + mobility regardless of the user's selected goal.
 */
export function calcBmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (weightKg == null || heightCm == null || weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi: number | null): "UNDERWEIGHT" | "NORMAL" | "OVERWEIGHT" | "OBESE" | null {
  if (bmi == null) return null;
  if (bmi < 18.5) return "UNDERWEIGHT";
  if (bmi < 25) return "NORMAL";
  if (bmi < 30) return "OVERWEIGHT";
  return "OBESE";
}
