"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";

type ProgressEntry = {
  id: string;
  date: string;
  workoutName: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  rating: number | null;
};

export default function ClientWorkoutsPage() {
  const [rows, setRows] = React.useState<ProgressEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/client/workouts/progress", {
          cache: "no-store",
        });
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        setRows(
          data.map((p: any) => ({
            id: p.id as string,
            date: new Date(p.completedDate).toLocaleDateString(),
            workoutName: p.workoutExercise?.workout?.name ?? "Workout",
            exerciseName: p.workoutExercise?.exercise?.name ?? "Exercise",
            sets: (p.actualSets as number | null) ?? null,
            reps: (p.actualReps as number | null) ?? null,
            weight: (p.weight as number | null) ?? null,
            rating: (p.rating as number | null) ?? null,
          })),
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Workouts & Progress</h1>
        <p className="text-sm text-muted-foreground">
          View your completed workouts, exercises, and basic progress analytics.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          No workout progress recorded yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-3">
              <div className="space-y-1 text-xs">
                <div className="text-[11px] text-muted-foreground">{r.date}</div>
                <div className="text-sm font-medium">
                  {r.workoutName} — {r.exerciseName}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {r.sets != null && r.reps != null
                    ? `${r.sets} sets × ${r.reps} reps`
                    : "Reps not recorded"}
                  {r.weight != null ? ` · ${r.weight} kg` : ""}
                  {r.rating != null ? ` · Rating ${r.rating}/10` : ""}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

