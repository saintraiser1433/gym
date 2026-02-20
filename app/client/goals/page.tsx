"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  deadline: string | null;
};

export default function ClientGoalsPage() {
  const [available, setAvailable] = React.useState<AvailableGoal[]>([]);
  const [selected, setSelected] = React.useState<ClientGoal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [newTarget, setNewTarget] = React.useState("");
  const [newDeadline, setNewDeadline] = React.useState("");
  const [selectedGoalId, setSelectedGoalId] = React.useState("");

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
          (availJson.data ?? []).map((g: any) => ({
            id: g.id as string,
            name: g.name as string,
            category: g.category as string,
          })),
        );
        setSelected(
          (mineJson.data ?? []).map((cg: any) => ({
            id: cg.id as string,
            goalId: cg.goalId as string,
            name: cg.goal?.name as string,
            category: cg.goal?.category as string,
            targetValue: (cg.targetValue as number | null) ?? null,
            deadline: cg.deadline
              ? new Date(cg.deadline).toLocaleDateString()
              : null,
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
      const payload: any = { goalId: selectedGoalId };
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
          deadline: payload.deadline
            ? new Date(payload.deadline).toLocaleDateString()
            : null,
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

  return (
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
                  placeholder="e.g. 10 kg lost"
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
                />
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
                {selected.map((g) => (
                  <Card key={g.id} className="p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{g.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatCategory(g.category)}
                        </div>
                      </div>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                      <dt>Target</dt>
                      <dd>{g.targetValue != null ? g.targetValue : "—"}</dd>
                      <dt>Deadline</dt>
                      <dd>{g.deadline ?? "—"}</dd>
                    </dl>
                    <div className="mt-3">
                      <Button size="xs" variant="outline" className="h-7 px-2 text-[11px]" asChild>
                        <Link href={`/client/workouts?goalId=${encodeURIComponent(g.goalId)}`}>
                          View workouts
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

