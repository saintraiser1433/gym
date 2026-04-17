"use client";

import * as React from "react";
import Link from "next/link";
import { RequireMembership } from "@/components/require-membership";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AvailableGoal = {
  id: string;
  name: string;
  category: string;
};

type ClientGoal = {
  id: string;
  goalId: string;
  name: string;
  category: string;
  targetValue: number | null;
  targetSessions: number | null;
  currentValue: number | null;
  deadline: string | null;
  deadlineRaw?: string | null;
  status: string;
  updates?: { id: string; message: string; createdAt: string }[];
};

export default function ClientGoalsPage() {
  const [available, setAvailable] = React.useState<AvailableGoal[]>([]);
  const [selected, setSelected] = React.useState<ClientGoal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [newTarget, setNewTarget] = React.useState("");
  const [newDeadline, setNewDeadline] = React.useState("");
  const [selectedGoalId, setSelectedGoalId] = React.useState("");
  const [removeGoalId, setRemoveGoalId] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState(false);
  const [feedbackByGoalId, setFeedbackByGoalId] = React.useState<Record<string, string>>({});
  const [savingFeedbackGoalId, setSavingFeedbackGoalId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [availRes, mineRes] = await Promise.all([
          fetch("/api/client/goals/available", { cache: "no-store" }),
          fetch("/api/client/goals", { cache: "no-store" }),
        ]);
        const availJson = await availRes.json();
        const mineJson = await mineRes.json();
        setAvailable(
          (Array.isArray(availJson.data) ? availJson.data : []).map((g: { id: string; name: string; category: string }) => ({
            id: g.id,
            name: g.name,
            category: g.category,
          })),
        );
        setSelected(
          (Array.isArray(mineJson.data) ? mineJson.data : []).map((cg: {
            id: string;
            goalId: string;
            goal?: { name?: string; category?: string };
            targetValue?: number | null;
            targetSessions?: number | null;
            currentValue?: number | null;
            deadline?: string | null;
            status?: string;
            updates?: { id: string; message: string; createdAt: string }[];
          }) => ({
            id: cg.id,
            goalId: cg.goalId,
            name: cg.goal?.name ?? "Goal",
            category: cg.goal?.category ?? "",
            targetValue: cg.targetValue ?? null,
            targetSessions: cg.targetSessions ?? null,
            currentValue: cg.currentValue ?? null,
            deadline: cg.deadline
              ? new Date(cg.deadline).toLocaleDateString()
              : null,
            deadlineRaw: cg.deadline
              ? new Date(cg.deadline).toISOString()
              : null,
            status: cg.status ?? "ACTIVE",
            updates: Array.isArray(cg.updates)
              ? cg.updates.map((u: { id: string; message: string; createdAt: string }) => ({
                  id: String(u.id),
                  message: String(u.message),
                  createdAt: String(u.createdAt),
                }))
              : [],
          })),
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const formatCategory = (c: string) =>
    c
      .split("_")
      .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
      .join(" ");

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId) {
      toast.error("Please choose a goal");
      return;
    }
    const existing = selected.find((g) => g.goalId === selectedGoalId);
    if (existing) {
      toast.error("You already selected this goal");
      return;
    }
    setSavingId("new");
    try {
      const payload: { goalId: string; targetValue?: number; deadline?: string } = { goalId: selectedGoalId };
      if (newTarget) payload.targetValue = Number(newTarget);
      if (newDeadline) payload.deadline = newDeadline;
      const res = await fetch("/api/client/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save goal");
        return;
      }
      const g = available.find((a) => a.id === selectedGoalId);
      setSelected((prev) => [
        ...prev,
        {
          id: json.id as string,
          goalId: selectedGoalId,
          name: g?.name ?? "Goal",
          category: g?.category ?? "",
          targetValue: payload.targetValue ?? null,
          targetSessions: json.targetSessions ?? null,
          currentValue: null,
          deadline: payload.deadline
            ? new Date(payload.deadline).toLocaleDateString()
            : null,
          status: "ACTIVE",
        },
      ]);
      setSelectedGoalId("");
      setNewTarget("");
      setNewDeadline("");
      toast.success("Goal added");
    } catch {
      toast.error("Failed to save goal");
    } finally {
      setSavingId(null);
    }
  };

  const handleRemoveGoal = async () => {
    if (!removeGoalId) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/client/goals/${removeGoalId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Failed to remove goal");
        return;
      }
      setSelected((prev) => prev.filter((g) => g.id !== removeGoalId));
      setRemoveGoalId(null);
      toast.success("Goal removed");
    } catch {
      toast.error("Failed to remove goal");
    } finally {
      setRemoving(false);
    }
  };

  const saveFeedback = async (goalId: string) => {
    const message = (feedbackByGoalId[goalId] ?? "").trim();
    if (!message) {
      toast.error("Write a progress update first");
      return;
    }
    setSavingFeedbackGoalId(goalId);
    try {
      const res = await fetch(`/api/client/goals/${goalId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save update");
        return;
      }
      setSelected((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, updates: [json, ...(g.updates ?? [])].slice(0, 5) }
            : g,
        ),
      );
      setFeedbackByGoalId((prev) => ({ ...prev, [goalId]: "" }));
      toast.success("Progress update saved");
    } finally {
      setSavingFeedbackGoalId(null);
    }
  };

  return (
    <RequireMembership>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold">My Workout Goals</h1>
          <p className="text-sm text-muted-foreground">
            Select your personal workout goals and track high-level progress.
          </p>
        </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Card className="p-3">
            <h2 className="mb-2 text-sm font-semibold">Add a new goal</h2>
            <form
              onSubmit={handleAddGoal}
              className="grid gap-2 text-[11px] sm:grid-cols-3"
            >
              <div className="space-y-1 sm:col-span-1">
                <label className="font-medium" htmlFor="goal">
                  Goal
                </label>
                <select
                  id="goal"
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                >
                  <option value="">Select goal</option>
                  {available.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({formatCategory(g.category)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="target">
                  Target (optional)
                </label>
                <Input
                  id="target"
                  type="number"
                  className="h-7 text-[11px]"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="e.g. 10 kg"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="deadline">
                  Deadline (optional)
                </label>
                <Input
                  id="deadline"
                  type="date"
                  className="h-7 text-[11px]"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Must be today or a future date.
                </p>
              </div>
              <div className="flex items-end justify-end sm:col-span-3">
                <Button
                  type="submit"
                  size="xs"
                  className="h-7 px-3 text-[11px]"
                  disabled={savingId !== null}
                >
                  {savingId ? "Saving..." : "Add goal"}
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">My goals</h2>
            {selected.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">
                You don&apos;t have any goals yet. Add one above.
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {selected.map((g) => {
                  const isSessionGoal = g.targetSessions != null;
                  const target = isSessionGoal ? (g.targetSessions ?? 0) : (g.targetValue ?? 0);
                  const current = g.currentValue ?? 0;
                  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                  const deadlineDate = g.deadline ? new Date(g.deadline) : null;
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const daysLeft = deadlineDate
                    ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isOverdue = daysLeft != null && daysLeft < 0;
                  return (
                    <Card key={g.id} className="p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{g.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatCategory(g.category)}
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
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
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
                              ? g.targetValue
                              : "—"}
                        </dd>
                        <dt>Deadline</dt>
                        <dd>
                          {g.deadline ?? "—"}
                          {daysLeft != null && g.status === "ACTIVE" && (
                            <span
                              className={`ml-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
                            >
                              ({isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`})
                            </span>
                          )}
                        </dd>
                      </dl>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button size="xs" variant="outline" className="h-7 px-2 text-[11px]" asChild>
                          <Link href={`/client/workouts?goalId=${encodeURIComponent(g.goalId)}`}>
                            View workouts
                          </Link>
                        </Button>
                        <AlertDialog
                          open={removeGoalId === g.id}
                          onOpenChange={(open) => !open && setRemoveGoalId(null)}
                        >
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove goal</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove &quot;{g.name}&quot; from your goals? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                disabled={removing}
                                className={buttonVariants({ variant: "outline", size: "sm" })}
                              >
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.preventDefault();
                                  void handleRemoveGoal();
                                }}
                                disabled={removing}
                                className={buttonVariants({ variant: "destructive", size: "sm" })}
                              >
                                {removing ? "Removing…" : "Remove"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                            onClick={() => setRemoveGoalId(g.id)}
                          >
                            Remove
                          </Button>
                        </AlertDialog>
                      </div>
                      <div className="mt-3 space-y-2 border-t pt-2">
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Goal progress updates
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={feedbackByGoalId[g.id] ?? ""}
                            onChange={(e) =>
                              setFeedbackByGoalId((prev) => ({
                                ...prev,
                                [g.id]: e.target.value,
                              }))
                            }
                            placeholder="e.g. my biceps improved today"
                            className="h-7 text-[11px]"
                          />
                          <Button
                            type="button"
                            size="xs"
                            className="h-7 px-2 text-[11px]"
                            disabled={savingFeedbackGoalId === g.id}
                            onClick={() => void saveFeedback(g.id)}
                          >
                            {savingFeedbackGoalId === g.id ? "Saving..." : "Send"}
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {(g.updates ?? []).length === 0 ? (
                            <p className="text-[10px] text-muted-foreground">
                              No updates yet.
                            </p>
                          ) : (
                            (g.updates ?? []).slice(0, 3).map((u) => (
                              <div key={u.id} className="rounded bg-muted/40 px-2 py-1 text-[11px]">
                                <div>{u.message}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(u.createdAt).toLocaleString()}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </RequireMembership>
  );
}

