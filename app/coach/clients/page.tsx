"use client";

import * as React from "react";
import { format } from "date-fns";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientGoalPlanForm } from "@/components/coach/client-goal-plan-form";
import {
  GoalWorkoutPlanEditor,
  type WorkoutPlanRow,
} from "@/components/coach/goal-workout-plan-editor";
import { Target, Dumbbell, User, Lock, Unlock, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ageFromDob,
  autoMacros,
  bmiCategory,
  calcBmi,
  calcBmr,
  calcTdee,
  goalRecommendation,
  type ActivityLevel,
  type GoalCategory,
} from "@/lib/bmr";
import type { WeeklyPlanResult, WeeklyPlanRow } from "@/lib/weekly-plan";

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
  workoutPlanMode?: "CATALOG" | "CUSTOM";
  customWorkouts?: {
    workoutId: string;
    planDay: number;
    intensity?: string | null;
    workout?: { id: string; name: string };
  }[];
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

type RawClientGoal = {
  id: string;
  goalId: string;
  goal?: { name?: string; category?: string };
  targetValue?: number | null;
  targetSessions?: number | null;
  currentValue?: number | null;
  deadline?: string | null;
  status?: string;
  workoutPlanMode?: "CATALOG" | "CUSTOM";
  customWorkouts?: {
    workoutId: string;
    planDay: number;
    intensity?: string | null;
    workout?: { id: string; name: string };
  }[];
};

function mapRawClientGoal(g: RawClientGoal): ClientGoal {
  return {
    id: g.id,
    goalId: g.goalId,
    goal: {
      name: g.goal?.name ?? "—",
      category: g.goal?.category ?? "",
    },
    targetValue: g.targetValue,
    targetSessions: g.targetSessions,
    currentValue: g.currentValue,
    deadline: g.deadline,
    status: g.status ?? "ACTIVE",
    workoutPlanMode: g.workoutPlanMode === "CUSTOM" ? "CUSTOM" : "CATALOG",
    customWorkouts:
      g.customWorkouts?.map((cw) => ({
        workoutId: cw.workoutId,
        planDay: cw.planDay,
        intensity: cw.intensity ?? null,
        workout: cw.workout,
      })) ?? [],
  };
}

function buildGoalPlanEdit(g: ClientGoal): {
  mode: "CATALOG" | "CUSTOM";
  rows: WorkoutPlanRow[];
} {
  return {
    mode: g.workoutPlanMode === "CUSTOM" ? "CUSTOM" : "CATALOG",
    rows:
      g.customWorkouts && g.customWorkouts.length > 0
        ? g.customWorkouts.map((cw) => ({
            workoutId: cw.workoutId,
            planDay: String(cw.planDay),
            intensity: cw.intensity?.trim() || "Medium",
          }))
        : [{ workoutId: "", planDay: "1", intensity: "Medium" }],
  };
}

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
    activityLevel: string;
    dailyCalorieTarget: string;
    dailyProteinGrams: string;
    dailyCarbsGrams: string;
    dailyFatGrams: string;
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
    activityLevel: "SEDENTARY",
    dailyCalorieTarget: "",
    dailyProteinGrams: "",
    dailyCarbsGrams: "",
    dailyFatGrams: "",
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

  type CatalogGoal = {
    id: string;
    name: string;
    category: string;
    targetSessions: number | null;
    defaultWorkouts: {
      workoutId: string;
      name: string;
      planDay: number;
      difficulty?: string | null;
    }[];
  };
  const [catalogGoals, setCatalogGoals] = React.useState<CatalogGoal[]>([]);
  const [workoutLibrary, setWorkoutLibrary] = React.useState<
    { id: string; name: string; source?: "catalog" | "coach"; difficulty?: string | null }[]
  >([]);
  const [newCoachGoalId, setNewCoachGoalId] = React.useState("");
  const [newCoachTarget, setNewCoachTarget] = React.useState("");
  const [newCoachDeadline, setNewCoachDeadline] = React.useState("");
  const [newCoachWorkoutPlanMode, setNewCoachWorkoutPlanMode] = React.useState<
    "CATALOG" | "CUSTOM"
  >("CATALOG");
  const [newCoachCustomWorkouts, setNewCoachCustomWorkouts] = React.useState<WorkoutPlanRow[]>([]);
  const [savingNewCoachGoal, setSavingNewCoachGoal] = React.useState(false);
  const [removingCoachGoalId, setRemovingCoachGoalId] = React.useState<string | null>(null);
  const [goalPlanEdits, setGoalPlanEdits] = React.useState<
    Record<string, { mode: "CATALOG" | "CUSTOM"; rows: WorkoutPlanRow[] }>
  >({});
  const [savingGoalPlanId, setSavingGoalPlanId] = React.useState<string | null>(null);

  const [mealPlanTitle, setMealPlanTitle] = React.useState("Meal plan");
  const [mealPlanContent, setMealPlanContent] = React.useState("");
  const [mealPlanSaving, setMealPlanSaving] = React.useState(false);

  const [weeklyPlan, setWeeklyPlan] = React.useState<WeeklyPlanRow[]>([]);
  const [weeklyPlanMeta, setWeeklyPlanMeta] = React.useState<{
    source: WeeklyPlanResult["source"];
    goalId: string | null;
    goalName: string | null;
    planMode: "CATALOG" | "CUSTOM" | null;
  }>({ source: "recommended", goalId: null, goalName: null, planMode: null });
  const [weeklyPlanLoading, setWeeklyPlanLoading] = React.useState(false);
  const [planGoalId, setPlanGoalId] = React.useState("");

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
      const text = await res.text();
      let json: { data?: Record<string, unknown>; error?: string } | null = null;
      if (text) {
        try {
          json = JSON.parse(text) as { data?: Record<string, unknown>; error?: string };
        } catch {
          json = null;
        }
      }
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to load client");
        return;
      }
      if (!json?.data) {
        toast.error("Failed to load client");
        return;
      }
      {
        const d = json.data as {
          id: string;
          user?: { name?: string; email?: string; phone?: string | null };
          weight?: number | null;
          height?: number | null;
          dateOfBirth?: string | null;
          gender?: string | null;
          occupation?: string | null;
          address?: string | null;
          emergencyContact?: string | null;
          gymNotes?: string | null;
          nutritionObjective?: string | null;
          activityLevel?: string | null;
          dailyCalorieTarget?: number | null;
          dailyProteinGrams?: number | null;
          dailyCarbsGrams?: number | null;
          dailyFatGrams?: number | null;
          recommendedGymSessionsPerWeek?: number | null;
          workoutScheduleNotes?: string | null;
          goals?: unknown[];
          mealPlan?: { title?: string; content?: string } | null;
        };
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
          activityLevel: d.activityLevel ?? "SEDENTARY",
          dailyCalorieTarget:
            d.dailyCalorieTarget != null ? String(d.dailyCalorieTarget) : "",
          dailyProteinGrams:
            d.dailyProteinGrams != null ? String(d.dailyProteinGrams) : "",
          dailyCarbsGrams:
            d.dailyCarbsGrams != null ? String(d.dailyCarbsGrams) : "",
          dailyFatGrams:
            d.dailyFatGrams != null ? String(d.dailyFatGrams) : "",
          recommendedGymSessionsPerWeek:
            d.recommendedGymSessionsPerWeek != null
              ? String(d.recommendedGymSessionsPerWeek)
              : "",
          workoutScheduleNotes: d.workoutScheduleNotes ?? "",
        });
        const rawGoals = (d.goals ?? []) as RawClientGoal[];
        const mappedGoals = rawGoals.map(mapRawClientGoal);
        setGoals(mappedGoals);
        setGoalPlanEdits(
          Object.fromEntries(mappedGoals.map((g) => [g.id, buildGoalPlanEdit(g)])),
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

  const loadWorkouts = React.useCallback(
    async (id: string, goalId?: string, planDay?: number) => {
      setWorkoutsLoading(true);
      try {
        const params = new URLSearchParams();
        if (goalId) params.set("goalId", goalId);
        if (goalId && planDay != null) params.set("day", `day-${planDay}`);
        const qs = params.toString();
        const url = qs
          ? `/api/coach/clients/${id}/workouts?${qs}`
          : `/api/coach/clients/${id}/workouts`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        setWorkouts(json.data ?? []);
      } finally {
        setWorkoutsLoading(false);
      }
    },
    [],
  );

  const workoutsSectionRef = React.useRef<HTMLElement | null>(null);

  const primaryAssignedGoalId = React.useMemo(
    () => goals.find((g) => g.status === "ACTIVE")?.goalId ?? goals[0]?.goalId ?? null,
    [goals],
  );

  const activePlanGoalId = planGoalId || primaryAssignedGoalId;

  const scrollToWorkoutsSection = React.useCallback(() => {
    workoutsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const viewWorkoutsForPlan = React.useCallback(
    async (planDay?: number) => {
      if (!clientId) return;
      scrollToWorkoutsSection();
      if (activePlanGoalId) {
        await loadWorkouts(clientId, activePlanGoalId, planDay);
      } else {
        await loadWorkouts(clientId);
        if (planDay != null) {
          toast.message("Assign a catalog goal below to link day-specific workouts.");
        }
      }
    },
    [clientId, activePlanGoalId, loadWorkouts, scrollToWorkoutsSection],
  );

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
      setNewCoachWorkoutPlanMode("CATALOG");
      setNewCoachCustomWorkouts([]);
      setGoalPlanEdits({});
      setPlanGoalId("");
      setWeeklyPlan([]);
      setWeeklyPlanMeta({ source: "recommended", goalId: null, goalName: null, planMode: null });
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
                  defaultWorkouts?: {
                    workoutId: string;
                    name: string;
                    planDay: number;
                    difficulty?: string | null;
                  }[];
                }) => ({
                  id: g.id,
                  name: g.name,
                  category: g.category,
                  targetSessions: g.targetSessions ?? null,
                  defaultWorkouts: g.defaultWorkouts ?? [],
                }),
              ),
            );
          })
          .catch(() => setCatalogGoals([])),
        fetch("/api/coach/workouts/library", { cache: "no-store" })
          .then((r) => r.json())
          .then((j) => setWorkoutLibrary(Array.isArray(j.data) ? j.data : []))
          .catch(() => setWorkoutLibrary([])),
      ]);
    },
    [loadClientDetail, loadWorkouts, loadProgress],
  );

  const toggleContactLock = React.useCallback(() => {
    if (contactFieldsUnlocked) {
      const b = contactBaselineRef.current;
      setProfileDraft((p) => ({
        ...p,
        userPhone: b.userPhone,
      }));
      setContactFieldsUnlocked(false);
    } else {
      setContactFieldsUnlocked(true);
    }
  }, [contactFieldsUnlocked]);

  const bmrDerived = React.useMemo(() => {
    const weight = profileDraft.weight === "" ? null : parseFloat(profileDraft.weight);
    const height = profileDraft.height === "" ? null : parseFloat(profileDraft.height);
    const age = ageFromDob(profileDraft.dateOfBirth || null);
    const bmr = calcBmr(weight, height, age, profileDraft.gender || null);
    const tdee = calcTdee(bmr, (profileDraft.activityLevel || "SEDENTARY") as ActivityLevel);
    const bmi = calcBmi(weight, height);
    const bmiTag = bmiCategory(bmi);
    return { weight, height, age, bmr, tdee, bmi, bmiTag };
  }, [
    profileDraft.weight,
    profileDraft.height,
    profileDraft.dateOfBirth,
    profileDraft.gender,
    profileDraft.activityLevel,
  ]);

  const activeAssignedGoal = React.useMemo(() => {
    const id = activePlanGoalId;
    if (!id) return null;
    return goals.find((g) => g.goalId === id) ?? null;
  }, [goals, activePlanGoalId]);

  const goalForMacros: GoalCategory | null = React.useMemo(() => {
    const cat = activeAssignedGoal?.goal?.category;
    if (cat === "WEIGHT_LOSS") return "WEIGHT_LOSS";
    if (cat === "MUSCLE_GAIN") return "MUSCLE_GAIN";
    if (cat === "ENDURANCE") return "ENDURANCE";
    if (cat === "FLEXIBILITY") return "FLEXIBILITY";
    if (cat === "GENERAL_FITNESS") return "GENERAL_FITNESS";
    const v = profileDraft.nutritionObjective;
    if (!v) return null;
    if (v === "WEIGHT_LOSS" || v === "SLIMMING") return "WEIGHT_LOSS";
    if (v === "MUSCLE_GAIN") return "MUSCLE_GAIN";
    if (v === "GENERAL_FITNESS" || v === "MAINTENANCE") return "GENERAL_FITNESS";
    return null;
  }, [activeAssignedGoal, profileDraft.nutritionObjective]);

  const workoutRec = React.useMemo(
    () => goalRecommendation(goalForMacros),
    [goalForMacros],
  );

  const loadWeeklyPlan = React.useCallback(
    async (
      id: string,
      opts?: {
        goalId?: string | null;
        nutritionObjective?: string;
        bmi?: number | null;
      },
    ) => {
      setWeeklyPlanLoading(true);
      try {
        const params = new URLSearchParams();
        const gid = opts?.goalId ?? planGoalId ?? primaryAssignedGoalId;
        if (gid) params.set("goalId", gid);
        const activeGoal = goals.find(
          (g) => g.goalId === (opts?.goalId ?? planGoalId ?? primaryAssignedGoalId),
        );
        const objective =
          opts?.nutritionObjective ??
          activeGoal?.goal?.category ??
          profileDraft.nutritionObjective;
        if (objective) params.set("nutritionObjective", objective);
        const bmiVal = opts?.bmi ?? bmrDerived.bmi;
        if (bmiVal != null) params.set("bmi", String(bmiVal));
        const qs = params.toString();
        const res = await fetch(
          `/api/coach/clients/${id}/weekly-plan${qs ? `?${qs}` : ""}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        const data = json.data as WeeklyPlanResult | undefined;
        setWeeklyPlan(data?.rows ?? []);
        setWeeklyPlanMeta({
          source: data?.source ?? "recommended",
          goalId: data?.goalId ?? null,
          goalName: data?.goalName ?? null,
          planMode: data?.planMode ?? null,
        });
      } catch {
        setWeeklyPlan([]);
        setWeeklyPlanMeta({ source: "recommended", goalId: null, goalName: null, planMode: null });
      } finally {
        setWeeklyPlanLoading(false);
      }
    },
    [planGoalId, primaryAssignedGoalId, profileDraft.nutritionObjective, bmrDerived.bmi, goals],
  );

  React.useEffect(() => {
    if (!clientId || !detailOpen) return;
    if (goals.length > 0 && !planGoalId) {
      const defaultId =
        goals.find((g) => g.status === "ACTIVE")?.goalId ?? goals[0]?.goalId ?? "";
      if (defaultId) setPlanGoalId(defaultId);
    }
  }, [clientId, detailOpen, goals, planGoalId]);

  React.useEffect(() => {
    if (goals.length === 0) return;
    setGoalPlanEdits((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const g of goals) {
        if (!next[g.id]) {
          next[g.id] = buildGoalPlanEdit(g);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [goals]);

  React.useEffect(() => {
    const cat = activeAssignedGoal?.goal?.category;
    if (!cat) return;
    setProfileDraft((p) =>
      p.nutritionObjective === cat ? p : { ...p, nutritionObjective: cat },
    );
  }, [activeAssignedGoal?.goal?.category]);

  React.useEffect(() => {
    if (!clientId || !detailOpen) return;
    void loadWeeklyPlan(clientId, {
      goalId: activePlanGoalId,
      nutritionObjective: profileDraft.nutritionObjective,
      bmi: bmrDerived.bmi,
    });
  }, [
    clientId,
    detailOpen,
    activePlanGoalId,
    profileDraft.nutritionObjective,
    profileDraft.weight,
    profileDraft.height,
    bmrDerived.bmi,
    goals.length,
    loadWeeklyPlan,
  ]);

  const fiberDisplay = React.useMemo(() => {
    const cal =
      profileDraft.dailyCalorieTarget === ""
        ? null
        : parseFloat(profileDraft.dailyCalorieTarget);
    if (cal == null || !Number.isFinite(cal) || cal <= 0) return null;
    return Math.max(25, Math.round((cal / 1000) * 14));
  }, [profileDraft.dailyCalorieTarget]);

  const applyMacroValues = React.useCallback(
    (macros: NonNullable<ReturnType<typeof autoMacros>>) => {
      setProfileDraft((p) => {
        const nextCal = String(macros.calories);
        const nextP = String(macros.proteinG);
        const nextC = String(macros.carbsG);
        const nextF = String(macros.fatG);
        if (
          p.dailyCalorieTarget === nextCal &&
          p.dailyProteinGrams === nextP &&
          p.dailyCarbsGrams === nextC &&
          p.dailyFatGrams === nextF
        ) {
          return p;
        }
        return {
          ...p,
          dailyCalorieTarget: nextCal,
          dailyProteinGrams: nextP,
          dailyCarbsGrams: nextC,
          dailyFatGrams: nextF,
        };
      });
    },
    [],
  );

  const applyAutoMacros = React.useCallback(() => {
    const macros = autoMacros(goalForMacros, bmrDerived.weight, bmrDerived.tdee);
    if (!macros) {
      toast.error("Set weight, height, date of birth, gender, activity level, and assign a catalog goal first.");
      return;
    }
    applyMacroValues(macros);
    toast.success("Recalculated macros from BMR / goal.");
  }, [goalForMacros, bmrDerived.weight, bmrDerived.tdee, applyMacroValues]);

  React.useEffect(() => {
    if (!detailOpen) return;
    const macros = autoMacros(goalForMacros, bmrDerived.weight, bmrDerived.tdee);
    if (!macros) return;
    applyMacroValues(macros);
  }, [
    detailOpen,
    goalForMacros,
    bmrDerived.weight,
    bmrDerived.tdee,
    applyMacroValues,
  ]);

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
          dateOfBirth: profileDraft.dateOfBirth || null,
          gender: profileDraft.gender || null,
          nutritionObjective: profileDraft.nutritionObjective || null,
          activityLevel: profileDraft.activityLevel || null,
          dailyCalorieTarget:
            profileDraft.dailyCalorieTarget === ""
              ? null
              : parseFloat(profileDraft.dailyCalorieTarget),
          dailyProteinGrams:
            profileDraft.dailyProteinGrams === ""
              ? null
              : parseFloat(profileDraft.dailyProteinGrams),
          dailyCarbsGrams:
            profileDraft.dailyCarbsGrams === ""
              ? null
              : parseFloat(profileDraft.dailyCarbsGrams),
          dailyFatGrams:
            profileDraft.dailyFatGrams === ""
              ? null
              : parseFloat(profileDraft.dailyFatGrams),
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

  const selectedCatalogGoal = React.useMemo(
    () => catalogGoals.find((c) => c.id === newCoachGoalId) ?? null,
    [catalogGoals, newCoachGoalId],
  );

  const submitNewCoachGoal = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!clientId || !newCoachGoalId) {
        toast.error("Choose a goal from the list");
        return;
      }
      if (
        newCoachWorkoutPlanMode === "CUSTOM" &&
        !newCoachCustomWorkouts.some((r) => r.workoutId.trim())
      ) {
        toast.error("Add at least one workout for a custom plan");
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
          workoutPlanMode: "CATALOG" | "CUSTOM";
          customWorkouts?: { workoutId: string; planDay: number; intensity?: string }[];
        } = {
          goalId: newCoachGoalId,
          workoutPlanMode: newCoachWorkoutPlanMode,
        };
        if (newCoachTarget.trim()) {
          if (sessionGoal) payload.targetSessions = parseInt(newCoachTarget, 10);
          else payload.targetValue = Number(newCoachTarget);
        }
        if (newCoachDeadline) payload.deadline = newCoachDeadline;
        if (newCoachWorkoutPlanMode === "CUSTOM") {
          payload.customWorkouts = newCoachCustomWorkouts
            .filter((r) => r.workoutId.trim())
            .map((r) => ({
              workoutId: r.workoutId.trim(),
              planDay: Math.max(1, Math.min(7, parseInt(r.planDay, 10) || 1)),
              intensity: r.intensity?.trim() || "Medium",
            }));
        }
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
        const created = json.data as RawClientGoal | undefined;
        if (created?.id) {
          const mapped = mapRawClientGoal(created);
          setGoals((prev) => {
            const without = prev.filter((r) => r.goalId !== mapped.goalId);
            return [...without, mapped];
          });
          setGoalPlanEdits((prev) => ({ ...prev, [mapped.id]: buildGoalPlanEdit(mapped) }));
        }
        toast.success("Workout goal assigned");
        setNewCoachGoalId("");
        setNewCoachTarget("");
        setNewCoachDeadline("");
        setNewCoachWorkoutPlanMode("CATALOG");
        setNewCoachCustomWorkouts([]);
        setPlanGoalId(newCoachGoalId);
        await loadClientDetail(clientId);
        await Promise.all([
          loadWorkouts(clientId, newCoachGoalId),
          loadWeeklyPlan(clientId, { goalId: newCoachGoalId }),
        ]);
      } finally {
        setSavingNewCoachGoal(false);
      }
    },
    [
      clientId,
      newCoachGoalId,
      newCoachTarget,
      newCoachDeadline,
      newCoachWorkoutPlanMode,
      newCoachCustomWorkouts,
      catalogGoals,
      loadClientDetail,
      loadWorkouts,
      loadWeeklyPlan,
    ],
  );

  const saveGoalWorkoutPlan = React.useCallback(
    async (g: ClientGoal) => {
      if (!clientId) return;
      const edit = goalPlanEdits[g.id];
      if (!edit) return;
      if (edit.mode === "CUSTOM" && !edit.rows.some((r) => r.workoutId.trim())) {
        toast.error("Add at least one workout for a custom plan");
        return;
      }
      setSavingGoalPlanId(g.id);
      try {
        const res = await fetch(`/api/coach/clients/${clientId}/goals/${g.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workoutPlanMode: edit.mode,
            customWorkouts:
              edit.mode === "CUSTOM"
                ? edit.rows
                    .filter((r) => r.workoutId.trim())
                    .map((r) => ({
                      workoutId: r.workoutId.trim(),
                      planDay: Math.max(1, Math.min(7, parseInt(r.planDay, 10) || 1)),
                      intensity: r.intensity?.trim() || "Medium",
                    }))
                : [],
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json?.error ?? "Could not save workout plan");
          return;
        }
        const updated = json.data as RawClientGoal | undefined;
        if (updated?.id) {
          const mapped = mapRawClientGoal(updated);
          setGoals((prev) => prev.map((r) => (r.id === mapped.id ? mapped : r)));
          setGoalPlanEdits((prev) => ({ ...prev, [mapped.id]: buildGoalPlanEdit(mapped) }));
        }
        toast.success("Workout plan updated");
        await loadClientDetail(clientId);
        if (planGoalId === g.goalId || !planGoalId) {
          await Promise.all([
            loadWeeklyPlan(clientId, { goalId: g.goalId }),
            loadWorkouts(clientId, g.goalId),
          ]);
        }
      } finally {
        setSavingGoalPlanId(null);
      }
    },
    [clientId, goalPlanEdits, loadClientDetail, loadWeeklyPlan, loadWorkouts, planGoalId],
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
        if (clientId) void loadWeeklyPlan(clientId);
      } finally {
        setRemovingCoachGoalId(null);
      }
    },
    [clientId, loadClientDetail, loadWorkouts, loadWeeklyPlan],
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
          <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-base font-semibold">
                {detailLoading ? "Loading…" : `${clientName} — Goals & workouts`}
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden p-4">
              {detailLoading ? (
                <p className="col-span-2 text-sm text-muted-foreground">Loading…</p>
              ) : (
                <>
                  <section className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-md border bg-muted/20 p-2">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-1">
                    <div className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <User className="h-4 w-4" />
                      Client goal plan
                    </h3>
                    <Card className="space-y-2 p-3 text-[11px]">
                      {clientEmail && (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">Email</span> {clientEmail}
                        </p>
                      )}
                      <ClientGoalPlanForm
                        profileDraft={{
                          userName: profileDraft.userName,
                          dateOfBirth: profileDraft.dateOfBirth,
                          weight: profileDraft.weight,
                          height: profileDraft.height,
                          gender: profileDraft.gender,
                          activityLevel: profileDraft.activityLevel,
                          dailyCalorieTarget: profileDraft.dailyCalorieTarget,
                          dailyProteinGrams: profileDraft.dailyProteinGrams,
                          dailyCarbsGrams: profileDraft.dailyCarbsGrams,
                          dailyFatGrams: profileDraft.dailyFatGrams,
                          recommendedGymSessionsPerWeek: profileDraft.recommendedGymSessionsPerWeek,
                          workoutScheduleNotes: profileDraft.workoutScheduleNotes,
                        }}
                        updateProfile={(patch) =>
                          setProfileDraft((p) => ({ ...p, ...patch }))
                        }
                        bmrDerived={bmrDerived}
                        goalForMacros={goalForMacros}
                        weeklyPlan={weeklyPlan}
                        weeklyPlanLoading={weeklyPlanLoading}
                        weeklyPlanSource={weeklyPlanMeta.source}
                        weeklyPlanGoalName={weeklyPlanMeta.goalName}
                        weeklyPlanMode={weeklyPlanMeta.planMode}
                        assignedGoals={goals.map((g) => ({
                          goalId: g.goalId,
                          name: g.goal.name,
                        }))}
                        planGoalId={planGoalId}
                        onPlanGoalChange={setPlanGoalId}
                        workoutRec={workoutRec}
                        fiberDisplay={fiberDisplay}
                        profileSaving={profileSaving}
                        onApplyAutoMacros={applyAutoMacros}
                        onSave={() => void saveProfile()}
                        onViewWorkouts={(planDay) => void viewWorkoutsForPlan(planDay)}
                      />
                      <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/15 p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] leading-snug text-muted-foreground">
                            Phone is the client&apos;s account detail.
                            {contactFieldsUnlocked ? " Lock to cancel unsaved edits." : " Unlock to edit."}
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
                                Edit phone
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1 sm:col-span-2">
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
                    </Card>
                    </div>

                    <div className="space-y-2 border-t border-border pt-4">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <Target className="h-4 w-4" />
                      Goals
                    </h3>
                    <Card className="space-y-3 p-3 text-[11px]">
                      <h4 className="text-xs font-semibold">Assign workout goals</h4>
                      <form onSubmit={submitNewCoachGoal} className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="space-y-1 sm:col-span-1">
                          <label className="font-medium">Workout</label>
                          <select
                            className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-[11px]"
                            value={newCoachGoalId}
                            onChange={(e) => setNewCoachGoalId(e.target.value)}
                          >
                            <option value="">Select workout</option>
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
                      </div>
                      {newCoachGoalId && (
                        <GoalWorkoutPlanEditor
                          mode={newCoachWorkoutPlanMode}
                          onModeChange={setNewCoachWorkoutPlanMode}
                          rows={newCoachCustomWorkouts}
                          onRowsChange={setNewCoachCustomWorkouts}
                          workouts={workoutLibrary}
                          defaultWorkouts={selectedCatalogGoal?.defaultWorkouts ?? []}
                          radioName="newCoachWorkoutPlanMode"
                        />
                      )}
                      <div className="flex justify-end">
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
                      <div className="grid gap-3">
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
                          const catalogDefaults =
                            catalogGoals.find((c) => c.id === g.goalId)?.defaultWorkouts ?? [];
                          const planEdit = goalPlanEdits[g.id] ?? buildGoalPlanEdit(g);
                          return (
                            <Card key={g.id} className="p-3 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-sm font-medium">{g.goal.name}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {formatCategory(g.goal.category ?? "")}
                                  </div>
                                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    Workouts:{" "}
                                    <span className="font-medium text-foreground">
                                      {g.workoutPlanMode === "CUSTOM"
                                        ? "Custom plan"
                                        : "Catalog defaults"}
                                    </span>
                                  </p>
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
                              <div className="mt-3 space-y-2 border-t pt-2">
                                <GoalWorkoutPlanEditor
                                  compact
                                  radioName={`plan-${g.id}`}
                                  mode={planEdit.mode}
                                  onModeChange={(mode) =>
                                    setGoalPlanEdits((prev) => ({
                                      ...prev,
                                      [g.id]: { ...planEdit, mode },
                                    }))
                                  }
                                  rows={planEdit.rows}
                                  onRowsChange={(rows) =>
                                    setGoalPlanEdits((prev) => ({
                                      ...prev,
                                      [g.id]: { ...planEdit, rows },
                                    }))
                                  }
                                  workouts={workoutLibrary}
                                  defaultWorkouts={catalogDefaults}
                                />
                                <Button
                                  type="button"
                                  size="xs"
                                  className="h-7 text-[11px]"
                                  disabled={savingGoalPlanId === g.id}
                                  onClick={() => void saveGoalWorkoutPlan(g)}
                                >
                                  {savingGoalPlanId === g.id ? "Saving…" : "Save workout plan"}
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
                    </div>

                    <div className="space-y-2 border-t border-border pt-4">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <UtensilsCrossed className="h-4 w-4" />
                      Meal plan
                    </h3>
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
                    </div>
                    </div>
                  </section>

                  <section
                    ref={workoutsSectionRef}
                    className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-md border bg-muted/20 p-2"
                  >
                    <div className="flex shrink-0 items-center justify-between gap-2">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                        <Dumbbell className="h-4 w-4" />
                        Workouts & progress
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
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                    {workoutsLoading ? (
                      <p className="text-xs text-muted-foreground">Loading…</p>
                    ) : workouts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No workouts linked to goals yet. Assign goals above so workouts from those goals appear here.
                      </p>
                    ) : (
                      <div className="grid gap-2">
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
                    <div className="border-t border-border pt-2">
                      <p className="mb-2 text-xs font-semibold">Progress</p>
                      {progressLoading ? (
                        <p className="text-xs text-muted-foreground">Loading…</p>
                      ) : progress.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No sessions logged yet.</p>
                      ) : (
                        <div className="max-h-36 space-y-1.5 overflow-y-auto">
                          {progress.map((r) => (
                            <Card key={r.id} className="p-2 text-xs">
                              <div className="text-[10px] text-muted-foreground">
                                {format(new Date(r.completedDate), "PP")}
                              </div>
                              <div className="text-[11px] font-medium">
                                {r.workout?.name ?? r.workoutExercise?.workout?.name ?? "Workout"}
                                {r.workoutExercise?.exercise?.name
                                  ? " — " + r.workoutExercise.exercise.name
                                  : ""}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
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
