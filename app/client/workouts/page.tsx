"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type WorkoutEquipmentItem = {
  equipmentName: string;
  quantity: number;
  targetKg?: number;
  targetPcs?: number;
};

type GoalWorkout = {
  id: string;
  name: string;
  description?: string | null;
  duration?: number | null;
  difficulty?: string | null;
  demoMediaUrl?: string | null;
  media?: {
    id: string;
    url: string;
    stepName?: string | null;
    description?: string | null;
    mediaType: "GIF" | "VIDEO";
    durationSeconds: number;
    order: number;
  }[];
  goals?: { id: string; name: string }[];
  equipment?: WorkoutEquipmentItem[];
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

type WorkoutExerciseOption = { id: string; name: string };

function ClientWorkoutsContent() {
  const searchParams = useSearchParams();
  const goalIdParam = searchParams.get("goalId") ?? "";

  const [workouts, setWorkouts] = React.useState<GoalWorkout[]>([]);
  const [expandedSteps, setExpandedSteps] = React.useState<Record<string, boolean>>({});
  const [progressRows, setProgressRows] = React.useState<ProgressEntry[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = React.useState(true);
  const [loadingProgress, setLoadingProgress] = React.useState(true);
  const [hasCoach, setHasCoach] = React.useState(false);

  const [logWorkout, setLogWorkout] = React.useState<GoalWorkout | null>(null);
  const [logExercises, setLogExercises] = React.useState<WorkoutExerciseOption[]>([]);
  const [logLoadingExercises, setLogLoadingExercises] = React.useState(false);
  const [logSubmitting, setLogSubmitting] = React.useState(false);
  const [canLogToday, setCanLogToday] = React.useState<{
    hasAttendance: boolean;
    loggedWorkoutIds: string[];
    reason?: string;
  } | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [logForm, setLogForm] = React.useState({
    workoutExerciseId: "",
    date: todayStr,
    sets: "",
    reps: "",
    weight: "",
    notes: "",
    rating: "",
  });

  const formatSeconds = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (mins === 0) return `${rem}s`;
    if (rem === 0) return `${mins}m`;
    return `${mins}m ${rem}s`;
  };

  const loadProgress = React.useCallback(async () => {
    const res = await fetch("/api/client/workouts/progress", { cache: "no-store" });
    const json = await safeJson(res);
    const data = Array.isArray(json?.data) ? json.data : [];
    setProgressRows(
      data.map((p: {
        id: string;
        completedDate: string;
        actualSets?: number | null;
        actualReps?: number | null;
        weight?: number | null;
        rating?: number | null;
        workout?: { name?: string | null } | null;
        workoutExercise?: { workout?: { name?: string | null } | null; exercise?: { name?: string | null } | null } | null;
      }) => ({
        id: p.id as string,
        date: new Date(p.completedDate).toLocaleDateString(),
        workoutName: p.workout?.name ?? p.workoutExercise?.workout?.name ?? "Workout",
        exerciseName: p.workoutExercise?.exercise?.name ?? "Session",
        sets: (p.actualSets as number | null) ?? null,
        reps: (p.actualReps as number | null) ?? null,
        weight: (p.weight as number | null) ?? null,
        rating: (p.rating as number | null) ?? null,
      })),
    );
  }, []);

  const safeJson = async (res: Response) => {
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  React.useEffect(() => {
    const load = async () => {
      setLoadingWorkouts(true);
      try {
        const url = goalIdParam
          ? `/api/client/goals/workouts?goalId=${encodeURIComponent(goalIdParam)}`
          : "/api/client/goals/workouts";
        const res = await fetch(url, { cache: "no-store" });
        const json = await safeJson(res);
        const data = Array.isArray(json?.data) ? json.data : [];
        setWorkouts(data);
      } finally {
        setLoadingWorkouts(false);
      }
    };
    void load();
  }, [goalIdParam]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadProgress();
      } finally {
        if (!cancelled) setLoadingProgress(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadProgress]);

  React.useEffect(() => {
    fetch("/api/client/me/membership", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setHasCoach(Boolean(d?.hasCoach)))
      .catch(() => setHasCoach(false));
  }, []);

  React.useEffect(() => {
    if (hasCoach) return;
    fetch(`/api/client/workouts/can-log?date=${todayStr}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        setCanLogToday({
          hasAttendance: !!d?.hasAttendance,
          loggedWorkoutIds: Array.isArray(d?.loggedWorkoutIds) ? d.loggedWorkoutIds : [],
          reason: d?.reason,
        })
      )
      .catch(() => setCanLogToday(null));
  }, [hasCoach, todayStr]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Workouts</h1>
        <p className="text-sm text-muted-foreground">
          Workouts linked to your goals. Add goals in My Goals to see workouts here.
        </p>
        {hasCoach && (
          <p className="mt-1 text-xs text-muted-foreground">
            Premium: Your coach logs your workout progress and attendance.
          </p>
        )}
      </div>
      {logWorkout && (
        <Card className="border-primary/40 bg-primary/5 p-2 text-xs">
          <span className="font-medium">Current workout:</span> {logWorkout.name}
        </Card>
      )}

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
          No workouts for the selected goal yet. Select goals in{" "}
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
                {(() => {
                  const steps = w.media?.length
                    ? w.media
                    : w.demoMediaUrl
                      ? [
                          {
                            id: `legacy-${w.id}`,
                            url: w.demoMediaUrl,
                            stepName: null,
                            description: null,
                            mediaType: w.demoMediaUrl.toLowerCase().endsWith(".gif") ? "GIF" : "VIDEO",
                            durationSeconds: (w.duration ?? 1) * 60,
                            order: 0,
                          },
                        ]
                      : [];
                  const isExpanded = expandedSteps[w.id] ?? false;

                  return (
                    <>
                      {(steps.length > 0 && isExpanded) && (
                        <div className="space-y-2 p-2 pb-0">
                          {steps.map((m, stepIndex) => (
                            <div key={m.id} className="relative overflow-hidden rounded-md border bg-muted">
                              <span className="absolute right-2 top-2 z-10 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] text-primary-foreground">
                                Step {stepIndex + 1}
                              </span>
                              <span className="absolute left-2 top-2 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                                {formatSeconds(m.durationSeconds)}
                              </span>
                              {m.url.toLowerCase().endsWith(".gif") || m.mediaType === "GIF" ? (
                                <img src={m.url} alt="" className="aspect-video w-full object-cover" />
                              ) : (
                                <video src={m.url} controls className="aspect-video w-full object-cover" preload="metadata" />
                              )}
                              {(m.stepName || m.description) && (
                                <div className="space-y-0.5 border-t bg-background/95 px-2 py-1 text-[11px] text-muted-foreground">
                                  {m.stepName && <div className="font-medium text-foreground">{m.stepName}</div>}
                                  {m.description && <div>{m.description}</div>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="p-3 space-y-2 text-[11px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Workout</div>
                      <div className="font-medium text-[12px]">{w.name}</div>
                    </div>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {w.difficulty ?? "—"}
                    </span>
                  </div>
                  {w.goals && w.goals.length > 0 && (
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Goal</div>
                      <div className="text-muted-foreground">{w.goals.map((g) => g.name).join(", ")}</div>
                    </div>
                  )}
                  {w.description && (
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Description</div>
                      <p className="text-muted-foreground line-clamp-3">{w.description}</p>
                    </div>
                  )}
                  {w.duration != null && (
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Duration</div>
                      <div className="text-muted-foreground">{w.duration} min</div>
                    </div>
                  )}
                  {w.equipment && w.equipment.length > 0 && (
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Equipments use</div>
                      <div className="mt-0.5 space-y-0.5 text-muted-foreground">
                        {w.equipment.map((e, i) => {
                          const parts: string[] = [e.equipmentName];
                          if (e.targetKg != null) parts.push(`${e.targetKg} kg`);
                          const pcs = e.targetPcs ?? e.quantity;
                          if (pcs != null) parts.push(parts.length > 1 ? `x ${pcs} pcs` : `${pcs} pcs`);
                          return <div key={i}>{parts.join(" ")}</div>;
                        })}
                      </div>
                    </div>
                  )}
                  {!hasCoach && (
                    <div className="mt-3 pt-2 border-t">
                      {canLogToday && !canLogToday.hasAttendance && canLogToday.reason && (
                        <p className="text-[10px] text-muted-foreground mb-1">{canLogToday.reason}</p>
                      )}
                      {canLogToday?.hasAttendance && canLogToday.loggedWorkoutIds.includes(w.id) && (
                        <p className="text-[10px] text-muted-foreground mb-1">Already logged for this workout today.</p>
                      )}
                      {((w.media?.length ?? 0) > 0 || Boolean(w.demoMediaUrl)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] w-full mb-2"
                          onClick={() =>
                            setExpandedSteps((prev) => ({ ...prev, [w.id]: !(prev[w.id] ?? false) }))
                          }
                        >
                          {(expandedSteps[w.id] ?? false) ? "Hide steps" : "Show steps"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] w-full"
                        disabled={canLogToday != null && (!canLogToday.hasAttendance || canLogToday.loggedWorkoutIds.includes(w.id))}
                        onClick={async () => {
                          setLogWorkout(w);
                          setLogForm((f) => ({
                            ...f,
                            workoutExerciseId: "",
                            date: new Date().toISOString().slice(0, 10),
                            sets: "",
                            reps: "",
                            weight: "",
                            notes: "",
                            rating: "",
                          }));
                          setLogExercises([]);
                          setLogLoadingExercises(true);
                          try {
                            const res = await fetch(`/api/client/goals/workouts/${w.id}/exercises`, { cache: "no-store" });
                            const json = await safeJson(res);
                            const data = Array.isArray(json?.data) ? json.data : [];
                            setLogExercises(data);
                            if (data.length > 0) setLogForm((f) => ({ ...f, workoutExerciseId: data[0].id }));
                          } finally {
                            setLogLoadingExercises(false);
                          }
                        }}
                      >
                        Log session
                      </Button>
                    </div>
                  )}
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

      {logWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold">Log session — {logWorkout.name}</h3>
            <p className="text-[11px] text-muted-foreground">
              You are logging progress for <span className="font-medium text-foreground">{logWorkout.name}</span>.
            </p>
            {logLoadingExercises ? (
              <p className="text-xs text-muted-foreground">Loading exercises…</p>
            ) : logExercises.length === 0 ? (
              <form
                className="space-y-3 text-[11px]"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLogSubmitting(true);
                  try {
                    const res = await fetch("/api/client/workouts/progress", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        workoutId: logWorkout.id,
                        completedDate: logForm.date ? new Date(logForm.date).toISOString() : undefined,
                        actualSets: logForm.sets ? parseInt(logForm.sets, 10) : undefined,
                        actualReps: logForm.reps ? parseInt(logForm.reps, 10) : undefined,
                        weight: logForm.weight ? parseFloat(logForm.weight) : undefined,
                        notes: logForm.notes || undefined,
                        rating: logForm.rating ? parseInt(logForm.rating, 10) : undefined,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      toast.error(err?.error ?? "Failed to log progress");
                      return;
                    }
                    toast.success("Progress logged");
                    setLogWorkout(null);
                    await loadProgress();
                    fetch(`/api/client/workouts/can-log?date=${new Date().toISOString().slice(0, 10)}`, { cache: "no-store" })
                      .then((r) => r.json())
                      .then((data) =>
                        setCanLogToday({
                          hasAttendance: !!data?.hasAttendance,
                          loggedWorkoutIds: Array.isArray(data?.loggedWorkoutIds) ? data.loggedWorkoutIds : [],
                          reason: data?.reason,
                        })
                      );
                  } finally {
                    setLogSubmitting(false);
                  }
                }}
              >
                <p className="text-xs text-muted-foreground">This workout has no exercises. Log a session for today (date is set automatically).</p>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Date</label>
                  <Input
                    type="date"
                    value={logForm.date}
                    readOnly
                    disabled
                    className="h-8 text-[11px] bg-muted"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Sets (optional)</label>
                    <Input
                      type="number"
                      min={0}
                      value={logForm.sets}
                      onChange={(e) => setLogForm((f) => ({ ...f, sets: e.target.value }))}
                      className="h-8 text-[11px]"
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Reps (optional)</label>
                    <Input
                      type="number"
                      min={0}
                      value={logForm.reps}
                      onChange={(e) => setLogForm((f) => ({ ...f, reps: e.target.value }))}
                      className="h-8 text-[11px]"
                      placeholder="—"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Weight kg (optional)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={logForm.weight}
                    onChange={(e) => setLogForm((f) => ({ ...f, weight: e.target.value }))}
                    className="h-8 text-[11px]"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Notes (optional)</label>
                  <Input
                    value={logForm.notes}
                    onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
                    className="h-8 text-[11px]"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Rating 1–10 (optional)</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={logForm.rating}
                    onChange={(e) => setLogForm((f) => ({ ...f, rating: e.target.value }))}
                    className="h-8 text-[11px]"
                    placeholder="—"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setLogWorkout(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={logSubmitting}>
                    {logSubmitting ? "Logging…" : "Log session"}
                  </Button>
                </div>
              </form>
            ) : (
              <form
                className="space-y-3 text-[11px]"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!logForm.workoutExerciseId) return;
                  setLogSubmitting(true);
                  try {
                    const res = await fetch("/api/client/workouts/progress", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        workoutExerciseId: logForm.workoutExerciseId,
                        completedDate: logForm.date ? new Date(logForm.date).toISOString() : undefined,
                        actualSets: logForm.sets ? parseInt(logForm.sets, 10) : undefined,
                        actualReps: logForm.reps ? parseInt(logForm.reps, 10) : undefined,
                        weight: logForm.weight ? parseFloat(logForm.weight) : undefined,
                        notes: logForm.notes || undefined,
                        rating: logForm.rating ? parseInt(logForm.rating, 10) : undefined,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      toast.error(err?.error ?? "Failed to log progress");
                      return;
                    }
                    toast.success("Progress logged");
                    setLogWorkout(null);
                    await loadProgress();
                    fetch(`/api/client/workouts/can-log?date=${new Date().toISOString().slice(0, 10)}`, { cache: "no-store" })
                      .then((r) => r.json())
                      .then((data) =>
                        setCanLogToday({
                          hasAttendance: !!data?.hasAttendance,
                          loggedWorkoutIds: Array.isArray(data?.loggedWorkoutIds) ? data.loggedWorkoutIds : [],
                          reason: data?.reason,
                        })
                      );
                  } finally {
                    setLogSubmitting(false);
                  }
                }}
              >
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Date (today)</label>
                  <Input
                    type="date"
                    value={logForm.date}
                    readOnly
                    disabled
                    className="h-8 text-[11px] bg-muted"
                  />
                </div>
                {logExercises.length > 1 && (
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Exercise</label>
                    <select
                      value={logForm.workoutExerciseId}
                      onChange={(e) => setLogForm((f) => ({ ...f, workoutExerciseId: e.target.value }))}
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
                    >
                      {logExercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Sets</label>
                    <Input
                      type="number"
                      min={0}
                      value={logForm.sets}
                      onChange={(e) => setLogForm((f) => ({ ...f, sets: e.target.value }))}
                      className="h-8 text-[11px]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Reps / Pcs</label>
                    <Input
                      type="number"
                      min={0}
                      value={logForm.reps}
                      onChange={(e) => setLogForm((f) => ({ ...f, reps: e.target.value }))}
                      className="h-8 text-[11px]"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Weight (kg)</label>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={logForm.weight}
                    onChange={(e) => setLogForm((f) => ({ ...f, weight: e.target.value }))}
                    className="h-8 text-[11px]"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Notes</label>
                  <Input
                    value={logForm.notes}
                    onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
                    className="h-8 text-[11px]"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Rating (1–10)</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={logForm.rating}
                    onChange={(e) => setLogForm((f) => ({ ...f, rating: e.target.value }))}
                    className="h-8 text-[11px]"
                    placeholder="Optional"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] flex-1"
                    onClick={() => setLogWorkout(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-8 text-[11px] flex-1" disabled={logSubmitting}>
                    {logSubmitting ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
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
