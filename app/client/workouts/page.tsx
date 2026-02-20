"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type GoalWorkout = {
  id: string;
  name: string;
  description?: string | null;
  duration?: number | null;
  difficulty?: string | null;
  demoMediaUrl?: string | null;
  goals?: { id: string; name: string }[];
};

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

function ClientWorkoutsContent() {
  const searchParams = useSearchParams();
  const goalIdParam = searchParams.get("goalId") ?? "";

  const [workouts, setWorkouts] = React.useState<GoalWorkout[]>([]);
  const [progressRows, setProgressRows] = React.useState<ProgressEntry[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = React.useState(true);
  const [loadingProgress, setLoadingProgress] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      setLoadingWorkouts(true);
      try {
        const url = goalIdParam
          ? `/api/client/goals/workouts?goalId=${encodeURIComponent(goalIdParam)}`
          : "/api/client/goals/workouts";
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        setWorkouts(data);
      } finally {
        setLoadingWorkouts(false);
      }
    };
    void load();
  }, [goalIdParam]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/client/workouts/progress", {
          cache: "no-store",
        });
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        setProgressRows(
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
        setLoadingProgress(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Workouts</h1>
        <p className="text-sm text-muted-foreground">
          Workouts linked to your goals. Add goals in My Goals to see workouts here.
        </p>
      </div>

      {goalIdParam && (
        <p className="text-xs text-muted-foreground">
          Showing workouts for this goal.{" "}
          <Link href="/client/workouts" className="underline">
            Show all goal workouts
          </Link>
        </p>
      )}

      {loadingWorkouts ? (
        <p className="text-sm text-muted-foreground">Loading workouts…</p>
      ) : workouts.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          No workouts yet. Select goals in{" "}
          <Link href="/client/goals" className="font-medium underline">
            My Goals
          </Link>{" "}
          to see workouts linked to those goals.
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Workouts from your goals</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {workouts.map((w) => (
              <Card key={w.id} className="overflow-hidden p-0">
                {w.demoMediaUrl && (
                  <div className="aspect-video w-full bg-muted">
                    {w.demoMediaUrl.toLowerCase().endsWith(".gif") ? (
                      <img
                        src={w.demoMediaUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        src={w.demoMediaUrl}
                        controls
                        className="h-full w-full object-cover"
                        preload="metadata"
                      />
                    )}
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-[12px]">{w.name}</div>
                      {w.goals?.length ? (
                        <div className="text-[10px] text-muted-foreground">
                          Goal: {w.goals.map((g) => g.name).join(", ")}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {w.difficulty ?? "—"}
                    </span>
                  </div>
                  {w.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {w.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {w.duration != null && <span>{w.duration} min</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Your progress</h2>
        {loadingProgress ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : progressRows.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            No workout progress recorded yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {progressRows.map((r) => (
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
    </div>
  );
}

export default function ClientWorkoutsPage() {
  return (
    <React.Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <ClientWorkoutsContent />
    </React.Suspense>
  );
}
