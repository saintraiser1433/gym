"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  difficultyToIntensity,
  intensityFromWorkoutDifficulty,
  WORKOUT_INTENSITY_OPTIONS,
} from "@/lib/weekly-plan";

export type WorkoutPlanRow = {
  workoutId: string;
  planDay: string;
  intensity: string;
};

type WorkoutOption = {
  id: string;
  name: string;
  source?: "catalog" | "coach";
  difficulty?: string | null;
};

type DefaultWorkout = {
  workoutId: string;
  name: string;
  planDay: number;
  difficulty?: string | null;
};

type GoalWorkoutPlanEditorProps = {
  mode: "CATALOG" | "CUSTOM";
  onModeChange: (mode: "CATALOG" | "CUSTOM") => void;
  rows: WorkoutPlanRow[];
  onRowsChange: (rows: WorkoutPlanRow[]) => void;
  workouts: WorkoutOption[];
  defaultWorkouts?: DefaultWorkout[];
  compact?: boolean;
  radioName?: string;
};

export function GoalWorkoutPlanEditor({
  mode,
  onModeChange,
  rows,
  onRowsChange,
  workouts,
  defaultWorkouts = [],
  compact,
  radioName = "workoutPlanMode",
}: GoalWorkoutPlanEditorProps) {
  const copyFromCatalog = () => {
    if (defaultWorkouts.length === 0) return;
    onRowsChange(
      defaultWorkouts.map((w) => ({
        workoutId: w.workoutId,
        planDay: String(w.planDay),
        intensity: intensityFromWorkoutDifficulty(w.difficulty),
      })),
    );
    onModeChange("CUSTOM");
  };

  const updateRow = (index: number, patch: Partial<WorkoutPlanRow>) => {
    onRowsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const onWorkoutSelect = (index: number, workoutId: string) => {
    const w = workouts.find((x) => x.id === workoutId);
    const patch: Partial<WorkoutPlanRow> = { workoutId };
    if (w && workoutId) {
      patch.intensity = intensityFromWorkoutDifficulty(w.difficulty);
    }
    updateRow(index, patch);
  };

  const addRow = () => {
    onRowsChange([...rows, { workoutId: "", planDay: "1", intensity: "Medium" }]);
  };

  const removeRow = (index: number) => {
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div
      className={
        compact
          ? "space-y-2"
          : "space-y-3 rounded-md border border-dashed border-muted-foreground/35 bg-muted/15 p-2"
      }
    >
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-foreground">Workout plan for this client</p>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Use admin defaults from the goal template, or build a custom weekly plan for this client only.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px]">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="radio"
            name={radioName}
            checked={mode === "CATALOG"}
            onChange={() => onModeChange("CATALOG")}
            className="h-3 w-3"
          />
          <span>Follow catalog defaults</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="radio"
            name={radioName}
            checked={mode === "CUSTOM"}
            onChange={() => onModeChange("CUSTOM")}
            className="h-3 w-3"
          />
          <span>Custom plan for this client</span>
        </label>
      </div>

      {mode === "CATALOG" ? (
        <div className="rounded-md border bg-background/80 p-2 text-[10px] text-muted-foreground">
          {defaultWorkouts.length > 0 ? (
            <ul className="list-inside list-disc space-y-0.5">
              {defaultWorkouts.map((w) => (
                <li key={`${w.workoutId}-${w.planDay}`}>
                  Day {w.planDay}: {w.name}
                  <span className="text-muted-foreground">
                    {" "}
                    ({difficultyToIntensity(w.difficulty) || "Medium"})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No workouts linked in Admin → Workout goals for this template yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-7 px-2 text-[10px]"
              disabled={defaultWorkouts.length === 0}
              onClick={copyFromCatalog}
            >
              Start from catalog defaults
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="h-7 px-2 text-[10px]"
              onClick={addRow}
            >
              Add workout row
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Plan day: 1 = Mon … 7 = Sun. Set intensity per row; it pre-fills when you pick a workout.
          </p>
          {rows.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Add at least one workout row.</p>
          ) : (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border bg-muted/25 p-2">
              {rows.map((row, index) => (
                <div
                  key={`${index}-${row.workoutId}`}
                  className="grid grid-cols-[52px_minmax(0,1fr)_76px_auto] items-center gap-1.5"
                >
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    className="h-7 text-[11px]"
                    value={row.planDay}
                    onChange={(e) => updateRow(index, { planDay: e.target.value })}
                    title="Plan day"
                  />
                  <select
                    className="flex h-7 min-w-0 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
                    value={row.workoutId}
                    onChange={(e) => onWorkoutSelect(index, e.target.value)}
                  >
                    <option value="">Select workout</option>
                    {workouts.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.source === "coach" ? " (yours)" : ""}
                      </option>
                    ))}
                  </select>
                  <select
                    className="flex h-7 w-full rounded-md border border-input bg-transparent px-1 text-[11px]"
                    value={row.intensity || "Medium"}
                    onChange={(e) => updateRow(index, { intensity: e.target.value })}
                    title="Intensity"
                  >
                    {WORKOUT_INTENSITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="h-7 px-1.5 text-[10px] text-destructive"
                    onClick={() => removeRow(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
