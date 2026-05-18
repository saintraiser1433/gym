"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ACTIVITY_LEVELS, dobFromAge, type WorkoutRecommendation } from "@/lib/bmr";
import type { WeeklyPlanRow, WeeklyPlanResult } from "@/lib/weekly-plan";
import { Flame, Sparkles } from "lucide-react";

export type GoalPlanProfileDraft = {
  userName: string;
  dateOfBirth: string;
  weight: string;
  height: string;
  gender: string;
  activityLevel: string;
  dailyCalorieTarget: string;
  dailyProteinGrams: string;
  dailyCarbsGrams: string;
  dailyFatGrams: string;
  recommendedGymSessionsPerWeek: string;
  workoutScheduleNotes: string;
};

type BmrDerived = {
  age: number | null;
  bmr: number | null;
  tdee: number | null;
  bmi: number | null;
  bmiTag: string | null;
  weight: number | null;
};

type ClientGoalPlanFormProps = {
  profileDraft: GoalPlanProfileDraft;
  updateProfile: (patch: Partial<GoalPlanProfileDraft>) => void;
  bmrDerived: BmrDerived;
  goalForMacros: string | null;
  weeklyPlan: WeeklyPlanRow[];
  weeklyPlanLoading: boolean;
  weeklyPlanSource: WeeklyPlanResult["source"];
  weeklyPlanGoalName: string | null;
  weeklyPlanMode?: "CATALOG" | "CUSTOM" | null;
  assignedGoals: { goalId: string; name: string }[];
  planGoalId: string;
  onPlanGoalChange: (goalId: string) => void;
  workoutRec: WorkoutRecommendation | null;
  fiberDisplay: number | null;
  profileSaving: boolean;
  onApplyAutoMacros: () => void;
  onSave: () => void;
  onViewWorkouts: (planDay?: number) => void;
};

const fieldLabel = "text-[10px] font-medium text-muted-foreground";
const fieldInput = "h-7 text-[11px]";

export function ClientGoalPlanForm({
  profileDraft,
  updateProfile,
  bmrDerived,
  goalForMacros,
  weeklyPlan,
  weeklyPlanLoading,
  weeklyPlanSource,
  weeklyPlanGoalName,
  weeklyPlanMode,
  assignedGoals,
  planGoalId,
  onPlanGoalChange,
  workoutRec,
  fiberDisplay,
  profileSaving,
  onApplyAutoMacros,
  onSave,
  onViewWorkouts,
}: ClientGoalPlanFormProps) {
  return (
    <div className="space-y-4 rounded-lg border-2 border-primary/20 bg-card p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Goal plan</p>

      {/* User profile */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-foreground">User profile</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={fieldLabel}>Name</label>
            <Input
              className={fieldInput}
              value={profileDraft.userName}
              onChange={(e) => updateProfile({ userName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className={fieldLabel}>Age</label>
            <Input
              type="number"
              min={0}
              max={120}
              className={fieldInput}
              placeholder="—"
              value={bmrDerived.age != null ? String(bmrDerived.age) : ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw === "") {
                  updateProfile({ dateOfBirth: "" });
                  return;
                }
                const n = parseInt(raw, 10);
                if (Number.isFinite(n) && n >= 0 && n <= 120) {
                  updateProfile({ dateOfBirth: dobFromAge(n) });
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <label className={fieldLabel}>Height (cm)</label>
            <Input
              type="number"
              min={0}
              step={0.1}
              className={fieldInput}
              value={profileDraft.height}
              onChange={(e) => updateProfile({ height: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className={fieldLabel}>Gender</label>
            <select
              className={cn(fieldInput, "flex h-7 w-full rounded-md border border-input bg-transparent px-2")}
              value={profileDraft.gender}
              onChange={(e) => updateProfile({ gender: e.target.value })}
            >
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className={fieldLabel}>Weight (kg)</label>
            <Input
              type="number"
              min={0}
              step={0.1}
              className={fieldInput}
              value={profileDraft.weight}
              onChange={(e) => updateProfile({ weight: e.target.value })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <label className={fieldLabel}>Workout</label>
                <select
                  className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-60"
                  value={planGoalId}
                  onChange={(e) => onPlanGoalChange(e.target.value)}
                  disabled={assignedGoals.length === 0}
                >
                  {assignedGoals.length === 0 ? (
                    <option value="">Select workout</option>
                  ) : (
                    assignedGoals.map((g) => (
                      <option key={g.goalId} value={g.goalId}>
                        {g.name}
                      </option>
                    ))
                  )}
                </select>
                {assignedGoals.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Assign workout goals in the Goals section below.
                  </p>
                )}
              </div>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="h-7 shrink-0 px-2 text-[11px]"
                disabled={!planGoalId}
                onClick={() => onViewWorkouts()}
              >
                View workout
              </Button>
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className={fieldLabel}>Activity level</label>
            <select
              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
              value={profileDraft.activityLevel}
              onChange={(e) => updateProfile({ activityLevel: e.target.value })}
            >
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-md border bg-muted/25 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Flame className="h-3 w-3 text-orange-500" />
            Smart plan (BMR)
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div>
              <p className="text-[9px] uppercase text-muted-foreground">BMR</p>
              <p className="text-[12px] font-semibold">
                {bmrDerived.bmr != null ? `${bmrDerived.bmr} kcal` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-muted-foreground">TDEE</p>
              <p className="text-[12px] font-semibold">
                {bmrDerived.tdee != null ? `${bmrDerived.tdee} kcal` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-muted-foreground">BMI</p>
              <p className="text-[12px] font-semibold">
                {bmrDerived.bmi != null ? bmrDerived.bmi : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-muted-foreground">Weight</p>
              <p className="text-[12px] font-semibold">
                {bmrDerived.weight != null ? `${bmrDerived.weight} kg` : "—"}
              </p>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Mifflin-St Jeor from height, weight, DOB, gender, and activity.
            {bmrDerived.bmi != null && bmrDerived.bmi > 30 && (
              <span className="ml-1 font-medium text-orange-700 dark:text-orange-300">
                BMI &gt; 30 — low-impact workout plan.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Nutritional plan */}
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[11px] font-semibold text-foreground">Nutritional plan</p>
        <div className="space-y-1">
          <label className={fieldLabel}>Daily calories (kcal)</label>
          <Input
            type="number"
            min={0}
            step={1}
            className={cn(fieldInput, "max-w-xs")}
            value={profileDraft.dailyCalorieTarget}
            onChange={(e) =>
              updateProfile({ dailyCalorieTarget: e.target.value })
            }
          />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Macros</p>
        <div className="space-y-2 border-l-2 border-muted-foreground/30 pl-3">
          {(
            [
              ["Protein", "dailyProteinGrams", profileDraft.dailyProteinGrams],
              ["Carbs", "dailyCarbsGrams", profileDraft.dailyCarbsGrams],
              ["Fats", "dailyFatGrams", profileDraft.dailyFatGrams],
            ] as const
          ).map(([label, key, value]) => (
            <div key={key} className="flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}:</span>
              <Input
                type="number"
                min={0}
                step={1}
                className={cn(fieldInput, "w-28")}
                value={value}
                onChange={(e) =>
                  updateProfile({ [key]: e.target.value })
                }
              />
              <span className="text-[11px] text-muted-foreground">g</span>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-muted-foreground">Fiber:</span>
            <Input
              readOnly
              aria-readonly
              tabIndex={-1}
              className={cn(fieldInput, "w-28 cursor-default bg-muted/50 text-muted-foreground")}
              placeholder="—"
              value={fiberDisplay != null ? String(fiberDisplay) : ""}
            />
            <span className="text-[11px] text-muted-foreground">g</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Calories and macros update automatically when weight, activity, or goal changes. Fiber follows daily calories.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={onApplyAutoMacros}
          disabled={bmrDerived.tdee == null || bmrDerived.weight == null || !goalForMacros}
        >
          <Sparkles className="h-3 w-3 text-orange-500" />
          Recalculate macros
        </Button>
      </div>

      {/* Workout plan table */}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-foreground">Workout plan</p>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            {weeklyPlanMode === "CUSTOM" && (
              <span className="rounded bg-violet-100 px-1.5 py-0.5 font-medium text-violet-900 dark:bg-violet-900/40 dark:text-violet-200">
                Custom plan
              </span>
            )}
            {weeklyPlanMode !== "CUSTOM" && weeklyPlanSource === "catalog" && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                From catalog
              </span>
            )}
            {weeklyPlanSource === "mixed" && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                Assigned + suggested
              </span>
            )}
            {weeklyPlanSource === "recommended" && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-medium">Recommended</span>
            )}
            {workoutRec && weeklyPlanSource !== "catalog" && (
              <span>
                {workoutRec.workoutType} · {workoutRec.frequency}
              </span>
            )}
          </div>
        </div>
        {weeklyPlanGoalName && (
          <p className="text-[10px] text-muted-foreground">
            Weekly plan from:{" "}
            <span className="font-medium text-foreground">{weeklyPlanGoalName}</span>
          </p>
        )}
        <p className="text-[10px] leading-snug text-muted-foreground">
          Rows marked <span className="text-green-700 dark:text-green-400">(assigned)</span> are workouts you
          linked in the goal (catalog or custom plan). With a <strong className="text-foreground">custom plan</strong>,
          intensity is what you set per row. With <strong className="text-foreground">catalog defaults</strong>,
          intensity comes from workout difficulty in Admin → Workouts. Days you did not
          assign show as &quot;Not scheduled&quot;. With <strong className="text-foreground">catalog defaults</strong>,
          empty days may show BMR suggestions.
        </p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[480px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="border-r border-border px-2 py-2 text-left font-semibold">Day</th>
                <th className="border-r border-border px-2 py-2 text-left font-semibold">Type</th>
                <th className="border-r border-border px-2 py-2 text-left font-semibold">Intensity</th>
                <th className="px-2 py-2 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {weeklyPlanLoading ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">
                    Loading workout plan…
                  </td>
                </tr>
              ) : weeklyPlan.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">
                    Assign a catalog goal below to load the weekly workout plan.
                  </td>
                </tr>
              ) : (
                weeklyPlan.map((row) => (
                  <tr key={`${row.planDay}-${row.day}`} className="border-b border-border last:border-b-0">
                    <td className="border-r border-border px-2 py-2 font-medium">{row.day}</td>
                    <td className="border-r border-border px-2 py-2">
                      {row.type}
                      {row.source === "catalog" && (
                        <span className="ml-1 text-[9px] text-green-700 dark:text-green-400">
                          (assigned)
                        </span>
                      )}
                      {row.source === "recommended" && (
                        <span className="ml-1 text-[9px] text-muted-foreground">(suggested)</span>
                      )}
                    </td>
                    <td className="border-r border-border px-2 py-2 text-muted-foreground">
                      {row.intensity}
                    </td>
                    <td className="px-2 py-2">
                      {row.source === "catalog" ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="h-7 border-0 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 px-2.5 text-[11px] font-medium text-white shadow-sm hover:from-orange-600 hover:via-orange-700 hover:to-amber-600 hover:text-white"
                          onClick={() => onViewWorkouts(row.planDay)}
                        >
                          View workout
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gym frequency */}
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Gym frequency &amp; schedule
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className={fieldLabel}>Sessions per week at the gym</label>
            <select
              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
              value={profileDraft.recommendedGymSessionsPerWeek}
              onChange={(e) =>
                updateProfile({ recommendedGymSessionsPerWeek: e.target.value })
              }
            >
              <option value="">— Not set —</option>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={String(n)}>
                  {n}× per week
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className={fieldLabel}>Schedule notes (optional)</label>
            <textarea
              className="flex min-h-[52px] w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-[11px] shadow-xs outline-none"
              placeholder="e.g. Mon / Wed / Fri evenings"
              value={profileDraft.workoutScheduleNotes}
              onChange={(e) =>
                updateProfile({ workoutScheduleNotes: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-2">
        <Button
          type="button"
          size="sm"
          className="h-7 text-[11px]"
          disabled={profileSaving}
          onClick={onSave}
        >
          {profileSaving ? "Saving…" : "Save profile & plan"}
        </Button>
      </div>
    </div>
  );
}
