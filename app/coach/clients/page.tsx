"use client";

import * as React from "react";
import { format } from "date-fns";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Dumbbell } from "lucide-react";
import { toast } from "sonner";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  joinDate: string;
};

type ClientGoal = {
  id: string;
  goalId: string;
  goal: { name: string; category?: string };
  targetValue?: number | null;
  targetSessions?: number | null;
  currentValue?: number | null;
  deadline?: string | null;
  status: string;
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
  equipment?: { equipmentName: string; quantity: number; targetKg?: number; targetPcs?: number }[];
};

type ProgressEntry = {
  id: string;
  completedDate: string;
  workout?: { name?: string };
  workoutExercise?: { workout?: { name?: string }; exercise?: { name?: string } };
  actualSets?: number | null;
  actualReps?: number | null;
  weight?: number | null;
  rating?: number | null;
};

const formatCategory = (c: string) =>
  c
    ? c
        .split("_")
        .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
        .join(" ")
    : "";

const formatSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (mins === 0) return `${rem}s`;
  if (rem === 0) return `${mins}m`;
  return `${mins}m ${rem}s`;
};

export default function CoachClientsPage() {
  const [rows, setRows] = React.useState<ClientRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [clientName, setClientName] = React.useState<string>("");
  const [goals, setGoals] = React.useState<ClientGoal[]>([]);
  const [workouts, setWorkouts] = React.useState<GoalWorkout[]>([]);
  const [progress, setProgress] = React.useState<ProgressEntry[]>([]);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [workoutsLoading, setWorkoutsLoading] = React.useState(false);
  const [progressLoading, setProgressLoading] = React.useState(false);

  const [logWorkout, setLogWorkout] = React.useState<GoalWorkout | null>(null);
  const [logExercises, setLogExercises] = React.useState<{ id: string; name: string }[]>([]);
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

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/clients", { cache: "no-store" });
      const json = await res.json();
      const data = json.data ?? [];
      setRows(
        data.map((c: { id: string; user?: { name?: string; email?: string }; joinDate?: string }) => ({
          id: c.id,
          name: c.user?.name ?? "—",
          email: c.user?.email ?? "—",
          joinDate: c.joinDate ? new Date(c.joinDate).toLocaleDateString() : "—",
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const loadClientDetail = React.useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/coach/clients/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.data) {
        const d = json.data;
        setClientId(d.id);
        setClientName(d.user?.name ?? "Client");
        setGoals(
          (d.goals ?? []).map((g: any) => ({
            id: g.id,
            goalId: g.goalId,
            goal: g.goal ?? { name: "—", category: "" },
            targetValue: g.targetValue,
            targetSessions: g.targetSessions,
            currentValue: g.currentValue,
            deadline: g.deadline,
            status: g.status ?? "ACTIVE",
          })),
        );
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadWorkouts = React.useCallback(async (id: string, goalId?: string) => {
    setWorkoutsLoading(true);
    try {
      const url = goalId
        ? `/api/coach/clients/${id}/workouts?goalId=${encodeURIComponent(goalId)}`
        : `/api/coach/clients/${id}/workouts`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      setWorkouts(json.data ?? []);
    } finally {
      setWorkoutsLoading(false);
    }
  }, []);

  const loadProgress = React.useCallback(async (id: string) => {
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/coach/clients/${id}/progress`, { cache: "no-store" });
      const json = await res.json();
      setProgress(json.data ?? []);
    } finally {
      setProgressLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!clientId) {
      setCanLogToday(null);
      return;
    }
    fetch(`/api/coach/clients/${clientId}/can-log?date=${todayStr}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        setCanLogToday({
          hasAttendance: !!d?.hasAttendance,
          loggedWorkoutIds: Array.isArray(d?.loggedWorkoutIds) ? d.loggedWorkoutIds : [],
          reason: d?.reason,
        })
      )
      .catch(() => setCanLogToday(null));
  }, [clientId, todayStr]);

  const openDetail = React.useCallback(
    async (id: string) => {
      setDetailOpen(true);
      setClientId(id);
      setClientName("");
      setGoals([]);
      setWorkouts([]);
      setProgress([]);
      setLogWorkout(null);
      await loadClientDetail(id);
      await Promise.all([loadWorkouts(id), loadProgress(id)]);
    },
    [loadClientDetail, loadWorkouts, loadProgress],
  );


  const handleOpenLog = React.useCallback(
    async (w: GoalWorkout) => {
      if (!clientId) return;
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
        const res = await fetch(
          `/api/coach/clients/${clientId}/workouts/${w.id}/exercises`,
          { cache: "no-store" },
        );
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        setLogExercises(data);
        if (data.length > 0) setLogForm((f) => ({ ...f, workoutExerciseId: data[0].id }));
      } finally {
        setLogLoadingExercises(false);
      }
    },
    [clientId],
  );

  const handleLogSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!clientId || !logWorkout) return;
      setLogSubmitting(true);
      try {
        const body: Record<string, unknown> = {
          completedDate: logForm.date ? new Date(logForm.date).toISOString() : undefined,
          actualSets: logForm.sets ? parseInt(logForm.sets, 10) : undefined,
          actualReps: logForm.reps ? parseInt(logForm.reps, 10) : undefined,
          weight: logForm.weight ? parseFloat(logForm.weight) : undefined,
          notes: logForm.notes || undefined,
          rating: logForm.rating ? parseInt(logForm.rating, 10) : undefined,
        };
        if (logForm.workoutExerciseId) {
          body.workoutExerciseId = logForm.workoutExerciseId;
        } else {
          body.workoutId = logWorkout.id;
        }
        const res = await fetch(`/api/coach/clients/${clientId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error ?? "Failed to log progress");
          return;
        }
        toast.success("Session logged");
        setLogWorkout(null);
        fetch(`/api/coach/clients/${clientId}/can-log?date=${todayStr}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((data) =>
            setCanLogToday({
              hasAttendance: !!data?.hasAttendance,
              loggedWorkoutIds: Array.isArray(data?.loggedWorkoutIds) ? data.loggedWorkoutIds : [],
              reason: data?.reason,
            })
          );
        await loadClientDetail(clientId);
        await loadProgress(clientId);
        await loadWorkouts(clientId);
      } finally {
        setLogSubmitting(false);
      }
    },
    [clientId, logWorkout, logForm, loadClientDetail, loadProgress, loadWorkouts],
  );

  const columns: Column<ClientRow>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "joinDate", header: "Join date" },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <Button
          size="xs"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() => openDetail(row.id)}
        >
          View goals & workouts
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">My Clients</h1>
        <p className="text-sm text-muted-foreground">
          View client goals and workouts (same as their view). Log sessions to their progress.
        </p>
      </div>

      <Card className="p-3">
        <DataTable
          columns={columns}
          data={rows}
          page={1}
          pageSize={rows.length || 10}
          total={rows.length}
          isLoading={loading}
          onPageChange={() => {}}
          onSearchChange={() => {}}
          emptyMessage="No Premium clients assigned to you yet."
        />
      </Card>

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-base font-semibold">
                {detailLoading ? "Loading…" : `${clientName} — Goals & workouts`}
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </div>
            <div className="overflow-y-auto p-4 space-y-6">
              {detailLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <>
                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <Target className="h-4 w-4" />
                      Goals
                    </h3>
                    {goals.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No goals set.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {goals.map((g) => {
                          const isSessionGoal = g.targetSessions != null;
                          const target = isSessionGoal ? (g.targetSessions ?? 0) : (g.targetValue ?? 0);
                          const current = g.currentValue ?? 0;
                          const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                          const deadlineDate = g.deadline ? new Date(g.deadline) : null;
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const daysLeft = deadlineDate
                            ? Math.ceil(
                                (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                              )
                            : null;
                          const isOverdue = daysLeft != null && daysLeft < 0;
                          return (
                            <Card key={g.id} className="p-3 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-sm font-medium">{g.goal.name}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {formatCategory(g.goal.category ?? "")}
                                  </div>
                                </div>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    g.status === "COMPLETED"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                      : g.status === "CANCELLED"
                                        ? "bg-muted text-muted-foreground"
                                        : "bg-primary/10 text-primary"
                                  }`}
                                >
                                  {g.status}
                                </span>
                              </div>
                              {target > 0 && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex justify-between text-[11px] text-muted-foreground">
                                    <span>
                                      {isSessionGoal
                                        ? `${Math.round(current)} / ${target} sessions`
                                        : `${current} / ${target}`}
                                    </span>
                                    {target > 0 && <span>{Math.round(pct)}%</span>}
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              <dl className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                                <dt>Target</dt>
                                <dd>
                                  {g.targetSessions != null
                                    ? `${g.targetSessions} sessions`
                                    : g.targetValue != null
                                      ? String(g.targetValue)
                                      : "—"}
                                </dd>
                                <dt>Deadline</dt>
                                <dd>
                                  {g.deadline ? format(new Date(g.deadline), "PP") : "—"}
                                  {daysLeft != null && g.status === "ACTIVE" && (
                                    <span
                                      className={
                                        isOverdue
                                          ? "ml-1 font-medium text-destructive"
                                          : "ml-1 text-muted-foreground"
                                      }
                                    >
                                      ({isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`})
                                    </span>
                                  )}
                                </dd>
                              </dl>
                              <div className="mt-3">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => clientId && loadWorkouts(clientId, g.goalId)}
                                >
                                  View workouts
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <Dumbbell className="h-4 w-4" />
                        Workouts from goals
                      </h3>
                      {clientId && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-7 text-[11px]"
                          onClick={() => loadWorkouts(clientId)}
                        >
                          Show all
                        </Button>
                      )}
                    </div>
                    {workoutsLoading ? (
                      <p className="text-xs text-muted-foreground">Loading…</p>
                    ) : workouts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No workouts linked to goals. Client adds goals in Goals to see workouts here.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {workouts.map((w) => (
                          <Card key={w.id} className="overflow-hidden p-0">
                            {(w.media?.length ? w.media : w.demoMediaUrl ? [{
                              id: `legacy-${w.id}`,
                              url: w.demoMediaUrl,
                              stepName: null,
                              description: null,
                              mediaType: w.demoMediaUrl.toLowerCase().endsWith(".gif") ? "GIF" : "VIDEO",
                              durationSeconds: (w.duration ?? 1) * 60,
                              order: 0,
                            }] : []).length > 0 && (
                              <div className="space-y-2 p-2 pb-0">
                                {(w.media?.length ? w.media : [{
                                  id: `legacy-${w.id}`,
                                  url: w.demoMediaUrl!,
                                  stepName: null,
                                  description: null,
                                  mediaType: w.demoMediaUrl!.toLowerCase().endsWith(".gif") ? "GIF" : "VIDEO",
                                  durationSeconds: (w.duration ?? 1) * 60,
                                  order: 0,
                                }]).map((m, stepIndex) => (
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
                            <div className="space-y-2 p-3 text-[11px]">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Title
                                  </div>
                                  <div className="text-[12px] font-medium">{w.name}</div>
                                </div>
                                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                                  {w.difficulty ?? "—"}
                                </span>
                              </div>
                              {w.goals && w.goals.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Goal
                                  </div>
                                  <div className="text-muted-foreground">
                                    {w.goals.map((g) => g.name).join(", ")}
                                  </div>
                                </div>
                              )}
                              {w.duration != null && (
                                <div>
                                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Duration
                                  </div>
                                  <div className="text-muted-foreground">{w.duration} min</div>
                                </div>
                              )}
                              <div className="border-t pt-2">
                                {canLogToday && !canLogToday.hasAttendance && canLogToday.reason && (
                                  <p className="text-[10px] text-muted-foreground mb-1">{canLogToday.reason}</p>
                                )}
                                {canLogToday?.hasAttendance && canLogToday.loggedWorkoutIds.includes(w.id) && (
                                  <p className="text-[10px] text-muted-foreground mb-1">Already logged for this workout today.</p>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-full text-[11px]"
                                  disabled={canLogToday != null && (!canLogToday.hasAttendance || canLogToday.loggedWorkoutIds.includes(w.id))}
                                  onClick={() => handleOpenLog(w)}
                                >
                                  Log session
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Progress</h3>
                    {progressLoading ? (
                      <p className="text-xs text-muted-foreground">Loading…</p>
                    ) : progress.length === 0 ? (
                      <Card className="p-4 text-sm text-muted-foreground">
                        No workout progress recorded yet.
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {progress.map((r) => (
                          <Card key={r.id} className="flex items-center justify-between p-3">
                            <div className="space-y-1 text-xs">
                              <div className="text-[11px] text-muted-foreground">
                                {format(new Date(r.completedDate), "PP")}
                              </div>
                              <div className="text-sm font-medium">
                                {r.workout?.name ?? r.workoutExercise?.workout?.name ?? "Workout"} —{" "}
                                {r.workoutExercise?.exercise?.name ?? "Session"}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {r.actualSets != null && r.actualReps != null
                                  ? `${r.actualSets} sets × ${r.actualReps} reps`
                                  : "Reps not recorded"}
                                {r.weight != null ? ` · ${r.weight} kg` : ""}
                                {r.rating != null ? ` · Rating ${r.rating}/10` : ""}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {logWorkout && clientId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm space-y-3 p-4">
            <h3 className="text-sm font-semibold">Log session — {logWorkout.name}</h3>
            {logLoadingExercises ? (
              <p className="text-xs text-muted-foreground">Loading exercises…</p>
            ) : (
              <form className="space-y-3 text-[11px]" onSubmit={handleLogSubmit}>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Date (today)
                  </label>
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
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                      Exercise
                    </label>
                    <select
                      value={logForm.workoutExerciseId}
                      onChange={(e) =>
                        setLogForm((f) => ({ ...f, workoutExerciseId: e.target.value }))
                      }
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
                    >
                      {logExercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {logExercises.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No exercises. Session will be logged for the workout.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                      Sets
                    </label>
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
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                      Reps / Pcs
                    </label>
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
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Weight (kg)
                  </label>
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
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Notes
                  </label>
                  <Input
                    value={logForm.notes}
                    onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
                    className="h-8 text-[11px]"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Rating (1–10)
                  </label>
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
                    className="h-8 flex-1 text-[11px]"
                    onClick={() => setLogWorkout(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 flex-1 text-[11px]"
                    disabled={logSubmitting}
                  >
                    {logSubmitting ? "Saving…" : "Log session"}
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
