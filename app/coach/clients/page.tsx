"use client";

import * as React from "react";
import { format } from "date-fns";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Dumbbell, User, Lock, Unlock, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Stored values are exactly Male / Female for coach intake. */
function normalizeGenderForSelect(raw: unknown): "" | "Male" | "Female" {
  if (raw == null || typeof raw !== "string") return "";
  const u = raw.trim().toLowerCase();
  if (u === "male" || u === "m") return "Male";
  if (u === "female" || u === "f") return "Female";
  return "";
}

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
  const [clientEmail, setClientEmail] = React.useState<string>("");
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

  type ProfileDraft = {
    userName: string;
    userPhone: string;
    weight: string;
    height: string;
    dateOfBirth: string;
    gender: string;
    occupation: string;
    address: string;
    emergencyContact: string;
    gymNotes: string;
    nutritionObjective: string;
    dailyCalorieTarget: string;
    dailyProteinGrams: string;
    recommendedGymSessionsPerWeek: string;
    workoutScheduleNotes: string;
  };

  const emptyProfileDraft = (): ProfileDraft => ({
    userName: "",
    userPhone: "",
    weight: "",
    height: "",
    dateOfBirth: "",
    gender: "",
    occupation: "",
    address: "",
    emergencyContact: "",
    gymNotes: "",
    nutritionObjective: "",
    dailyCalorieTarget: "",
    dailyProteinGrams: "",
    recommendedGymSessionsPerWeek: "",
    workoutScheduleNotes: "",
  });

  const [profileDraft, setProfileDraft] = React.useState<ProfileDraft>(() => emptyProfileDraft());
  const [profileSaving, setProfileSaving] = React.useState(false);
  /** When false, name/phone are read-only (client account values). Unlock to edit. */
  const [contactFieldsUnlocked, setContactFieldsUnlocked] = React.useState(false);
  const contactBaselineRef = React.useRef<{ userName: string; userPhone: string }>({
    userName: "",
    userPhone: "",
  });
  const [goalEdits, setGoalEdits] = React.useState<Record<string, { target: string; deadline: string }>>({});
  const [savingGoalId, setSavingGoalId] = React.useState<string | null>(null);

  type CatalogGoal = { id: string; name: string; category: string; targetSessions: number | null };
  const [catalogGoals, setCatalogGoals] = React.useState<CatalogGoal[]>([]);
  const [newCoachGoalId, setNewCoachGoalId] = React.useState("");
  const [newCoachTarget, setNewCoachTarget] = React.useState("");
  const [newCoachDeadline, setNewCoachDeadline] = React.useState("");
  const [savingNewCoachGoal, setSavingNewCoachGoal] = React.useState(false);
  const [removingCoachGoalId, setRemovingCoachGoalId] = React.useState<string | null>(null);

  const [mealPlanTitle, setMealPlanTitle] = React.useState("Meal plan");
  const [mealPlanContent, setMealPlanContent] = React.useState("");
  const [mealPlanSaving, setMealPlanSaving] = React.useState(false);

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
        setClientEmail(d.user?.email ?? "");
        const baselineName = d.user?.name ?? "";
        const baselinePhone = d.user?.phone ?? "";
        contactBaselineRef.current = { userName: baselineName, userPhone: baselinePhone };
        setProfileDraft({
          userName: baselineName,
          userPhone: baselinePhone,
          weight: d.weight != null ? String(d.weight) : "",
          height: d.height != null ? String(d.height) : "",
          dateOfBirth: d.dateOfBirth
            ? format(new Date(d.dateOfBirth), "yyyy-MM-dd")
            : "",
          gender: normalizeGenderForSelect(d.gender),
          occupation: d.occupation ?? "",
          address: d.address ?? "",
          emergencyContact: d.emergencyContact ?? "",
          gymNotes: d.gymNotes ?? "",
          nutritionObjective: d.nutritionObjective ?? "",
          dailyCalorieTarget:
            d.dailyCalorieTarget != null ? String(d.dailyCalorieTarget) : "",
          dailyProteinGrams:
            d.dailyProteinGrams != null ? String(d.dailyProteinGrams) : "",
          recommendedGymSessionsPerWeek:
            d.recommendedGymSessionsPerWeek != null
              ? String(d.recommendedGymSessionsPerWeek)
              : "",
          workoutScheduleNotes: d.workoutScheduleNotes ?? "",
        });
        const rawGoals = (d.goals ?? []) as {
          id: string;
          goalId: string;
          goal?: { name?: string; category?: string };
          targetValue?: number | null;
          targetSessions?: number | null;
          currentValue?: number | null;
          deadline?: string | null;
          status?: string;
        }[];
        setGoals(
          rawGoals.map((g) => ({
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
        const ge: Record<string, { target: string; deadline: string }> = {};
        for (const g of rawGoals) {
          const isSessionGoal = g.targetSessions != null;
          ge[g.id] = {
            target: isSessionGoal
              ? g.targetSessions != null
                ? String(g.targetSessions)
                : ""
              : g.targetValue != null
                ? String(g.targetValue)
                : "",
            deadline: g.deadline ? format(new Date(g.deadline), "yyyy-MM-dd") : "",
          };
        }
        setGoalEdits(ge);
        setMealPlanTitle(d.mealPlan?.title ?? "Meal plan");
        setMealPlanContent(d.mealPlan?.content ?? "");
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
      setClientEmail("");
      setGoals([]);
      setGoalEdits({});
      setContactFieldsUnlocked(false);
      setProfileDraft(emptyProfileDraft());
      setWorkouts([]);
      setProgress([]);
      setLogWorkout(null);
      setMealPlanTitle("Meal plan");
      setMealPlanContent("");
      setNewCoachGoalId("");
      setNewCoachTarget("");
      setNewCoachDeadline("");
      await loadClientDetail(id);
      await Promise.all([
        loadWorkouts(id),
        loadProgress(id),
        fetch("/api/coach/workout-goals", { cache: "no-store" })
          .then((r) => r.json())
          .then((j) => {
            const rows = Array.isArray(j.data) ? j.data : [];
            setCatalogGoals(
              rows.map(
                (g: {
                  id: string;
                  name: string;
                  category: string;
                  targetSessions?: number | null;
                }) => ({
                  id: g.id,
                  name: g.name,
                  category: g.category,
                  targetSessions: g.targetSessions ?? null,
                }),
              ),
            );
          })
          .catch(() => setCatalogGoals([])),
      ]);
    },
    [loadClientDetail, loadWorkouts, loadProgress],
  );

  const toggleContactLock = React.useCallback(() => {
    if (contactFieldsUnlocked) {
      const b = contactBaselineRef.current;
      setProfileDraft((p) => ({
        ...p,
        userName: b.userName,
        userPhone: b.userPhone,
      }));
      setContactFieldsUnlocked(false);
    } else {
      setContactFieldsUnlocked(true);
    }
  }, [contactFieldsUnlocked]);

  const saveProfile = React.useCallback(async () => {
    if (!clientId) return;
    setProfileSaving(true);
    try {
      const res = await fetch(`/api/coach/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            name: profileDraft.userName,
            phone: profileDraft.userPhone || null,
          },
          weight: profileDraft.weight === "" ? null : parseFloat(profileDraft.weight),
          height: profileDraft.height === "" ? null : parseFloat(profileDraft.height),
          nutritionObjective: profileDraft.nutritionObjective || null,
          dailyCalorieTarget:
            profileDraft.dailyCalorieTarget === ""
              ? null
              : parseFloat(profileDraft.dailyCalorieTarget),
          dailyProteinGrams:
            profileDraft.dailyProteinGrams === ""
              ? null
              : parseFloat(profileDraft.dailyProteinGrams),
          recommendedGymSessionsPerWeek:
            profileDraft.recommendedGymSessionsPerWeek === ""
              ? null
              : (() => {
                  const n = parseInt(profileDraft.recommendedGymSessionsPerWeek, 10);
                  return Number.isFinite(n) ? n : null;
                })(),
          workoutScheduleNotes: profileDraft.workoutScheduleNotes || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to save profile");
        return;
      }
      toast.success("Profile saved");
      await loadClientDetail(clientId);
      setContactFieldsUnlocked(false);
    } finally {
      setProfileSaving(false);
    }
  }, [clientId, profileDraft, loadClientDetail]);

  const saveGoalTargets = React.useCallback(
    async (g: ClientGoal) => {
      if (!clientId) return;
      const edit = goalEdits[g.id];
      if (!edit) return;
      setSavingGoalId(g.id);
      try {
        const isSessionGoal = g.targetSessions != null;
        const rawTarget = edit.target.trim();
        const payload: Record<string, unknown> = {
          deadline: edit.deadline || null,
        };
        if (isSessionGoal) {
          payload.targetSessions = rawTarget === "" ? null : parseInt(rawTarget, 10);
        } else {
          payload.targetValue = rawTarget === "" ? null : parseFloat(rawTarget);
        }
        const res = await fetch(`/api/coach/clients/${clientId}/goals/${g.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json?.error ?? "Failed to save goal targets");
          return;
        }
        toast.success("Goal targets updated");
        await loadClientDetail(clientId);
        await loadWorkouts(clientId);
      } finally {
        setSavingGoalId(null);
      }
    },
    [clientId, goalEdits, loadClientDetail, loadWorkouts],
  );

  const saveMealPlan = React.useCallback(async () => {
    if (!clientId) return;
    setMealPlanSaving(true);
    try {
      const res = await fetch(`/api/coach/clients/${clientId}/meal-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: mealPlanTitle.trim() || "Meal plan",
          content: mealPlanContent,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to save meal plan");
        return;
      }
      toast.success("Meal plan saved");
      await loadClientDetail(clientId);
    } finally {
      setMealPlanSaving(false);
    }
  }, [clientId, mealPlanTitle, mealPlanContent, loadClientDetail]);

  const submitNewCoachGoal = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!clientId || !newCoachGoalId) {
        toast.error("Choose a goal from the list");
        return;
      }
      setSavingNewCoachGoal(true);
      try {
        const sel = catalogGoals.find((c) => c.id === newCoachGoalId);
        const sessionGoal = sel != null && sel.targetSessions != null;
        const payload: {
          goalId: string;
          targetValue?: number;
          targetSessions?: number;
          deadline?: string;
        } = { goalId: newCoachGoalId };
        if (newCoachTarget.trim()) {
          if (sessionGoal) payload.targetSessions = parseInt(newCoachTarget, 10);
          else payload.targetValue = Number(newCoachTarget);
        }
        if (newCoachDeadline) payload.deadline = newCoachDeadline;
        const res = await fetch(`/api/coach/clients/${clientId}/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json?.error ?? "Could not add goal");
          return;
        }
        toast.success("Goal assigned");
        setNewCoachGoalId("");
        setNewCoachTarget("");
        setNewCoachDeadline("");
        await loadClientDetail(clientId);
        await loadWorkouts(clientId);
      } finally {
        setSavingNewCoachGoal(false);
      }
    },
    [
      clientId,
      newCoachGoalId,
      newCoachTarget,
      newCoachDeadline,
      catalogGoals,
      loadClientDetail,
      loadWorkouts,
    ],
  );

  const removeCoachGoal = React.useCallback(
    async (clientGoalId: string) => {
      if (!clientId) return;
      setRemovingCoachGoalId(clientGoalId);
      try {
        const res = await fetch(`/api/coach/clients/${clientId}/goals/${clientGoalId}`, {
          method: "DELETE",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json?.error ?? "Could not remove goal");
          return;
        }
        toast.success("Goal removed");
        await loadClientDetail(clientId);
        await loadWorkouts(clientId);
      } finally {
        setRemovingCoachGoalId(null);
      }
    },
    [clientId, loadClientDetail, loadWorkouts],
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
          Record client details, nutrition targets, and goal weights; view goals and workouts; log sessions to their
          progress.
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
                      <User className="h-4 w-4" />
                      Client profile &amp; nutrition
                    </h3>
                    <Card className="space-y-3 p-3 text-[11px]">
                      <p className="text-[11px] text-muted-foreground">
                        Record basics from your intake, set nutrition by objective, and how often they should train at the
                        gym each week. Goal-specific kg or session targets are saved under each goal below.
                      </p>
                      {clientEmail && (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">Email</span> {clientEmail}
                        </p>
                      )}
                      <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/15 p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] leading-snug text-muted-foreground">
                            Name and phone are the client&apos;s account details (same as their login profile).
                            {contactFieldsUnlocked ? " Lock to cancel unsaved edits." : " Unlock to allow changes."}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="h-7 shrink-0 gap-1 px-2 text-[11px]"
                            onClick={() => toggleContactLock()}
                          >
                            {contactFieldsUnlocked ? (
                              <>
                                <Lock className="h-3.5 w-3.5" aria-hidden />
                                Lock
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3.5 w-3.5" aria-hidden />
                                Edit name &amp; phone
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Name</label>
                            <Input
                              className={cn(
                                "h-7 text-[11px]",
                                !contactFieldsUnlocked && "cursor-not-allowed bg-muted/50",
                              )}
                              readOnly={!contactFieldsUnlocked}
                              aria-readonly={!contactFieldsUnlocked}
                              value={profileDraft.userName}
                              onChange={(e) =>
                                setProfileDraft((p) => ({ ...p, userName: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">
                              Phone <span className="font-normal">(client account)</span>
                            </label>
                            <Input
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              className={cn(
                                "h-7 text-[11px]",
                                !contactFieldsUnlocked && "cursor-not-allowed bg-muted/50",
                              )}
                              readOnly={!contactFieldsUnlocked}
                              aria-readonly={!contactFieldsUnlocked}
                              placeholder={contactFieldsUnlocked ? "—" : "No phone on file"}
                              value={profileDraft.userPhone}
                              onChange={(e) =>
                                setProfileDraft((p) => ({ ...p, userPhone: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 rounded-md border border-muted-foreground/25 bg-muted/10 p-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Personal (from registration)
                        </p>
                        <p className="text-[10px] leading-snug text-muted-foreground">
                          Same order as client signup. Editable only by the client — not here.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Date of birth</label>
                            <Input
                              type="date"
                              readOnly
                              aria-readonly
                              tabIndex={-1}
                              className="h-7 cursor-default bg-muted/50 text-[11px] text-muted-foreground"
                              value={profileDraft.dateOfBirth}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Gender</label>
                            <Input
                              readOnly
                              aria-readonly
                              tabIndex={-1}
                              className="h-7 cursor-default bg-muted/50 text-[11px] text-muted-foreground"
                              value={profileDraft.gender || "—"}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-medium text-muted-foreground">Occupation</label>
                            <Input
                              readOnly
                              aria-readonly
                              tabIndex={-1}
                              className="h-7 cursor-default bg-muted/50 text-[11px] text-muted-foreground"
                              value={profileDraft.occupation}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-medium text-muted-foreground">Address</label>
                            <textarea
                              readOnly
                              aria-readonly
                              tabIndex={-1}
                              className="flex min-h-[56px] w-full cursor-default rounded-md border border-input bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground shadow-xs outline-none"
                              value={profileDraft.address}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-medium text-muted-foreground">Emergency contact</label>
                            <Input
                              readOnly
                              aria-readonly
                              tabIndex={-1}
                              className="h-7 cursor-default bg-muted/50 text-[11px] text-muted-foreground"
                              value={profileDraft.emergencyContact}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">
                          Fitness goals / notes <span className="font-normal text-muted-foreground">(from registration)</span>
                        </label>
                        <textarea
                          readOnly
                          aria-readonly
                          tabIndex={-1}
                          className="flex min-h-[56px] w-full cursor-default rounded-md border border-input bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground shadow-xs outline-none"
                          value={profileDraft.gymNotes}
                        />
                      </div>
                      <div className="space-y-2 border-t pt-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Coach measurements
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Weight (kg)</label>
                            <Input
                              type="number"
                              min={0}
                              step={0.1}
                              className="h-7 text-[11px]"
                              value={profileDraft.weight}
                              onChange={(e) =>
                                setProfileDraft((p) => ({ ...p, weight: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Height (cm)</label>
                            <Input
                              type="number"
                              min={0}
                              step={0.1}
                              className="h-7 text-[11px]"
                              value={profileDraft.height}
                              onChange={(e) =>
                                setProfileDraft((p) => ({ ...p, height: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-2">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Nutrition guidance
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-medium text-muted-foreground">Primary objective</label>
                            <select
                              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
                              value={profileDraft.nutritionObjective}
                              onChange={(e) =>
                                setProfileDraft((p) => ({ ...p, nutritionObjective: e.target.value }))
                              }
                            >
                              <option value="">— Select —</option>
                              <option value="WEIGHT_LOSS">Weight loss</option>
                              <option value="SLIMMING">Slimming / toning</option>
                              <option value="MUSCLE_GAIN">Muscle gain</option>
                              <option value="GENERAL_FITNESS">General fitness</option>
                              <option value="MAINTENANCE">Maintenance</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Daily calories (kcal)</label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              className="h-7 text-[11px]"
                              value={profileDraft.dailyCalorieTarget}
                              onChange={(e) =>
                                setProfileDraft((p) => ({ ...p, dailyCalorieTarget: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">Daily protein (g)</label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              className="h-7 text-[11px]"
                              value={profileDraft.dailyProteinGrams}
                              onChange={(e) =>
                                setProfileDraft((p) => ({ ...p, dailyProteinGrams: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Gym frequency &amp; schedule
                        </div>
                        <p className="mb-2 text-[10px] text-muted-foreground">
                          Recommended in-gym sessions per week (e.g. 2× when slimming, or a different cadence for other goals).
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground">
                              Sessions per week at the gym
                            </label>
                            <select
                              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
                              value={profileDraft.recommendedGymSessionsPerWeek}
                              onChange={(e) =>
                                setProfileDraft((p) => ({
                                  ...p,
                                  recommendedGymSessionsPerWeek: e.target.value,
                                }))
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
                            <label className="text-[10px] font-medium text-muted-foreground">
                              Schedule notes (optional)
                            </label>
                            <textarea
                              className="flex min-h-[52px] w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-[11px] shadow-xs outline-none"
                              placeholder="e.g. Tuesday &amp; Thursday evenings; optional Saturday cardio"
                              value={profileDraft.workoutScheduleNotes}
                              onChange={(e) =>
                                setProfileDraft((p) => ({
                                  ...p,
                                  workoutScheduleNotes: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end border-t pt-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={profileSaving}
                          onClick={() => void saveProfile()}
                        >
                          {profileSaving ? "Saving…" : "Save profile & plan"}
                        </Button>
                      </div>
                    </Card>
                  </section>

                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <UtensilsCrossed className="h-4 w-4" />
                      Meal plan
                    </h3>
                    <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
                      Write a plan your client can read in their app (meals, portions, timing — plain text is fine).
                    </p>
                    <Card className="space-y-2 p-3 text-[11px]">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Title</label>
                        <Input
                          className="h-7 text-[11px]"
                          value={mealPlanTitle}
                          onChange={(e) => setMealPlanTitle(e.target.value)}
                          placeholder="Meal plan"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Plan</label>
                        <textarea
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-[11px] shadow-xs outline-none"
                          value={mealPlanContent}
                          onChange={(e) => setMealPlanContent(e.target.value)}
                          placeholder={"Breakfast: …\nLunch: …\nSnacks: …"}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={mealPlanSaving}
                          onClick={() => void saveMealPlan()}
                        >
                          {mealPlanSaving ? "Saving…" : "Save meal plan"}
                        </Button>
                      </div>
                    </Card>
                  </section>

                  <section>
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <Target className="h-4 w-4" />
                      Goals
                    </h3>
                    <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
                      You assign workout goals from the catalog (premium / coached clients don&apos;t pick their own). Align
                      with <span className="font-medium text-foreground">Primary objective</span>, macros, and{" "}
                      <span className="font-medium text-foreground">Sessions per week</span> above. Use{" "}
                      <span className="font-medium text-foreground">Coach-set targets</span> per goal for kg or session
                      progress.
                    </p>
                    <Card className="mb-3 space-y-2 p-3 text-[11px]">
                      <h4 className="text-xs font-semibold">Assign a goal</h4>
                      <form onSubmit={submitNewCoachGoal} className="grid gap-2 sm:grid-cols-3">
                        <div className="space-y-1 sm:col-span-1">
                          <label className="font-medium">Goal</label>
                          <select
                            className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
                            value={newCoachGoalId}
                            onChange={(e) => setNewCoachGoalId(e.target.value)}
                          >
                            <option value="">Select goal</option>
                            {catalogGoals.map((cg) => (
                              <option key={cg.id} value={cg.id}>
                                {cg.name} ({formatCategory(cg.category)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium">
                            Target (optional)
                            {newCoachGoalId
                              ? catalogGoals.find((c) => c.id === newCoachGoalId)?.targetSessions != null
                                ? " — sessions"
                                : " — kg / units"
                              : ""}
                          </label>
                          <Input
                            type="number"
                            min={0}
                            step={
                              newCoachGoalId &&
                              catalogGoals.find((c) => c.id === newCoachGoalId)?.targetSessions != null
                                ? 1
                                : 0.1
                            }
                            className="h-7 text-[11px]"
                            value={newCoachTarget}
                            onChange={(e) => setNewCoachTarget(e.target.value)}
                            placeholder={
                              newCoachGoalId &&
                              catalogGoals.find((c) => c.id === newCoachGoalId)?.targetSessions != null
                                ? "e.g. 12"
                                : "e.g. 10"
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-medium">Deadline (optional)</label>
                          <Input
                            type="date"
                            className="h-7 text-[11px]"
                            value={newCoachDeadline}
                            onChange={(e) => setNewCoachDeadline(e.target.value)}
                            min={new Date().toISOString().slice(0, 10)}
                          />
                        </div>
                        <div className="flex items-end justify-end sm:col-span-3">
                          <Button
                            type="submit"
                            size="xs"
                            className="h-7 px-3 text-[11px]"
                            disabled={savingNewCoachGoal}
                          >
                            {savingNewCoachGoal ? "Saving…" : "Add goal"}
                          </Button>
                        </div>
                      </form>
                    </Card>
                    {goals.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No goals assigned yet. Add one above.</p>
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
                              <div className="mt-3 space-y-2 border-t pt-2">
                                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Coach-set targets
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground">
                                      {isSessionGoal ? "Target sessions" : "Target (kg)"}
                                    </label>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={isSessionGoal ? 1 : 0.1}
                                      className="h-7 text-[11px]"
                                      value={goalEdits[g.id]?.target ?? ""}
                                      onChange={(e) =>
                                        setGoalEdits((prev) => ({
                                          ...prev,
                                          [g.id]: {
                                            deadline: prev[g.id]?.deadline ?? "",
                                            target: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground">Deadline</label>
                                    <Input
                                      type="date"
                                      className="h-7 text-[11px]"
                                      value={goalEdits[g.id]?.deadline ?? ""}
                                      onChange={(e) =>
                                        setGoalEdits((prev) => ({
                                          ...prev,
                                          [g.id]: {
                                            target: prev[g.id]?.target ?? "",
                                            deadline: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="xs"
                                  className="h-7 text-[11px]"
                                  disabled={savingGoalId === g.id}
                                  onClick={() => void saveGoalTargets(g)}
                                >
                                  {savingGoalId === g.id ? "Saving…" : "Save targets"}
                                </Button>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                                  disabled={removingCoachGoalId === g.id}
                                  onClick={() => void removeCoachGoal(g.id)}
                                >
                                  {removingCoachGoalId === g.id ? "Removing…" : "Remove goal"}
                                </Button>
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
                        No workouts linked to goals yet. Assign goals above so workouts from those goals appear here.
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
