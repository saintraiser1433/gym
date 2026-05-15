"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type WorkoutOption = { id: string; name: string };
type GoalWorkoutAssignment = { workoutId: string; name: string; planDay: number };

type GoalRow = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  goalWorkouts?: GoalWorkoutAssignment[];
};

export default function AdminGoalsPage() {
  const [rows, setRows] = React.useState<GoalRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<GoalRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    name: "",
    description: "",
    category: "GENERAL_FITNESS",
    goalWorkouts: [] as { workoutId: string; planDay: string }[],
  });
  const [workouts, setWorkouts] = React.useState<WorkoutOption[]>([]);
  const [saving, setSaving] = React.useState(false);

  const fetchData = React.useCallback(
    async (opts?: { page?: number; search?: string; cacheBust?: boolean }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(opts?.page ?? page));
        params.set("pageSize", String(pageSize));
        if (opts?.search ?? search) {
          params.set("search", (opts?.search ?? search) as string);
        }
        if (opts?.cacheBust) params.set("_", String(Date.now()));
        const res = await fetch(`/api/admin/goals?${params.toString()}`, {
          cache: "no-store",
        });
        const text = await res.text();
        let json: { data?: any[]; total?: number } | null = null;
        if (text) {
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
        }
        const data = json?.data ?? [];
        setRows(
          data.map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            category: g.category,
            goalWorkouts:
              g.goalWorkouts?.map((gw: { id?: string; workoutId?: string; name: string; planDay?: number }) => ({
                workoutId: gw.id ?? gw.workoutId ?? "",
                name: gw.name,
                planDay: gw.planDay ?? 1,
              })) ?? [],
          })),
        );
        setTotal(json?.total ?? 0);
        if (opts?.page) setPage(opts.page);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search],
  );

  const fetchWorkouts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/workouts", { cache: "no-store" });
      const text = await res.text();
      let json: { data?: WorkoutOption[] } | null = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      setWorkouts(json?.data ?? []);
    } catch {
      setWorkouts([]);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
    void fetchWorkouts();
  }, []);

  const openNewDialog = () => {
    setEditingGoal(null);
    setFormValues({
      name: "",
      description: "",
      category: "GENERAL_FITNESS",
      goalWorkouts: [{ workoutId: "", planDay: "1" }],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: GoalRow) => {
    setEditingGoal(row);
    setFormValues({
      name: row.name,
      description: row.description ?? "",
      category: row.category,
      goalWorkouts:
        row.goalWorkouts?.length
          ? row.goalWorkouts.map((gw) => ({
              workoutId: gw.workoutId,
              planDay: String(gw.planDay ?? 1),
            }))
          : [{ workoutId: "", planDay: "1" }],
    });
    setDialogOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const addGoalWorkoutRow = () => {
    setFormValues((prev) => ({
      ...prev,
      goalWorkouts: [...prev.goalWorkouts, { workoutId: "", planDay: "1" }],
    }));
  };

  const removeGoalWorkoutRow = (index: number) => {
    setFormValues((prev) => {
      const next = prev.goalWorkouts.filter((_, i) => i !== index);
      return {
        ...prev,
        goalWorkouts: next.length > 0 ? next : [{ workoutId: "", planDay: "1" }],
      };
    });
  };

  const updateGoalWorkoutRow = (
    index: number,
    patch: Partial<{ workoutId: string; planDay: string }>,
  ) => {
    setFormValues((prev) => ({
      ...prev,
      goalWorkouts: prev.goalWorkouts.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const normalizedGoalWorkouts = formValues.goalWorkouts
        .map((row) => ({
          workoutId: row.workoutId.trim(),
          planDay: Number.parseInt(row.planDay, 10) || 1,
        }))
        .filter((row) => row.workoutId.length > 0)
        .filter((row, index, list) => list.findIndex((x) => x.workoutId === row.workoutId && x.planDay === row.planDay) === index)
        .map((row) => ({
          workoutId: row.workoutId,
          workoutType: "PER_PCS" as const,
          targetValue: null as number | null,
          planDay: Math.max(1, Math.min(366, row.planDay)),
        }));

      const payload = {
        name: formValues.name,
        description: formValues.description || undefined,
        category: formValues.category,
        goalWorkouts: normalizedGoalWorkouts,
      };

      let res: Response;
      if (editingGoal) {
        res = await fetch(`/api/admin/goals/${editingGoal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? "Failed to save goal");
        return;
      }

      const updated = await res.json().catch(() => null);
      setDialogOpen(false);
      setEditingGoal(null);

      // Update the row from PATCH/POST response so the table shows new workouts immediately
      if (updated?.workouts && Array.isArray(updated.workouts)) {
        const goalWorkouts = updated.workouts as { id: string; name: string; planDay?: number }[];
        if (editingGoal) {
          setRows((prev) =>
            prev.map((r) =>
              r.id === editingGoal.id
                ? {
                    ...r,
                    name: updated.name ?? r.name,
                    description: updated.description ?? r.description,
                    category: updated.category ?? r.category,
                    goalWorkouts: goalWorkouts.map((w) => ({
                      workoutId: w.id,
                      name: w.name,
                      planDay: w.planDay ?? 1,
                    })),
                  }
                : r
            ),
          );
        } else if (updated.id) {
          setRows((prev) => [
            {
              id: updated.id,
              name: updated.name ?? "",
              description: updated.description ?? null,
              category: updated.category ?? "",
              goalWorkouts: goalWorkouts.map((w) => ({
                workoutId: w.id,
                name: w.name,
                planDay: w.planDay ?? 1,
              })),
            },
            ...prev,
          ]);
          setTotal((t) => t + 1);
        }
      }

      await fetchData({ page: 1, search, cacheBust: true });
      toast.success(editingGoal ? "Goal updated" : "Goal created");
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<GoalRow>[] = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description" },
    {
      key: "category",
      header: "Category",
      render: (row) =>
        row.category
          .split("_")
          .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
          .join(" "),
    },
    {
      key: "workouts",
      header: "Workouts",
      render: (row) => {
        if (!row.goalWorkouts?.length) return "—";
        return row.goalWorkouts
          .slice()
          .sort((a, b) => a.planDay - b.planDay)
          .map((w) => `${w.name} (Day ${w.planDay})`)
          .join(", ");
      },
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            className="h-7 w-7 p-0"
            aria-label={`Edit ${row.name}`}
            onClick={() => openEditDialog(row)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="xs"
                variant="outline"
                className="h-7 w-7 p-0"
                aria-label={`Delete ${row.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Delete goal?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &quot;{row.name}&quot;. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-7 px-2 text-[11px]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="h-7 px-3 text-[11px]"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await fetch(`/api/admin/goals/${row.id}`, {
                        method: "DELETE",
                      });
                      await fetchData({ page, search });
                      toast.success("Goal deleted");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Workout Goals</h1>
          <p className="text-sm text-muted-foreground">
            Goal templates and weekly workout links. Used by members and by coaches for premium clients.
          </p>
        </div>
        <Button
          size="xs"
          className="h-7 px-2 text-[11px]"
          onClick={openNewDialog}
        >
          New Goal
        </Button>
      </div>

      <Card className="space-y-2 border border-primary/15 bg-primary/5 p-3 text-[11px] leading-snug text-muted-foreground">
        <p className="font-semibold text-foreground">How this module fits the app</p>
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            <strong className="text-foreground">Workout goals (here)</strong> — Admin builds each goal
            template and links workouts by <strong>plan day</strong> (1 = Mon … 7 = Sun). This is the
            catalog, not a specific person&apos;s schedule yet.
          </li>
          <li>
            <strong className="text-foreground">Basic / no coach</strong> — After admin assigns a goal to
            the member (Admin → Client goals), they see these linked workouts under{" "}
            <strong className="text-foreground">Workouts</strong> and can log progress themselves by plan
            day.
          </li>
          <li>
            <strong className="text-foreground">Premium with coach</strong> — Members do{" "}
            <strong className="text-foreground">not</strong> pick goals themselves. The coach assigns a
            catalog goal in <strong className="text-foreground">Coach → My Clients</strong>; the weekly
            table and workouts come from what you configure below.
          </li>
        </ul>
        <p className="text-[10px]">
          Add workouts in Admin → Workouts first, then link them here. Empty plan days show coach
          recommendations until you add a catalog workout for that day.
        </p>
      </Card>

      <Card className="p-3">
        <DataTable
          columns={columns}
          data={rows}
          page={page}
          pageSize={pageSize}
          total={total}
          isLoading={loading}
          onPageChange={(newPage) => {
            void fetchData({ page: newPage });
          }}
          onSearchChange={(value) => {
            setSearch(value || undefined);
            void fetchData({ page: 1, search: value });
          }}
        />
      </Card>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">
              {editingGoal ? "Edit Goal" : "New Goal"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="font-medium" htmlFor="name">
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formValues.name}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formValues.description}
                  onChange={handleFormChange}
                  className="h-16 w-full rounded-md border bg-background px-2 py-1 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="category">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formValues.category}
                  onChange={handleFormChange}
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                >
                  <option value="WEIGHT_LOSS">Weight loss</option>
                  <option value="MUSCLE_GAIN">Muscle gain</option>
                  <option value="ENDURANCE">Endurance</option>
                  <option value="FLEXIBILITY">Flexibility</option>
                  <option value="GENERAL_FITNESS">General fitness</option>
                </select>
              </div>
              <div className="space-y-1 rounded-md border border-dashed border-muted-foreground/35 bg-muted/20 p-2">
                <label className="font-medium">Workouts (weekly plan template)</label>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Link library workouts to each plan day. Same workout can appear on multiple days.
                  These rows define what <strong className="text-foreground">basic members</strong> see when
                  that goal is assigned to them, and what <strong className="text-foreground">premium coached</strong>{" "}
                  clients see after their coach assigns this goal.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Plan day: <span className="font-medium text-foreground">1 = Mon</span>, 2 = Tue, 3 = Wed,
                  4 = Thu, 5 = Fri, 6 = Sat, 7 = Sun.
                </p>
                {workouts.length === 0 ? (
                  <p className="py-2 text-[11px] text-muted-foreground">
                    No workouts available. Add workouts in Admin → Workouts.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-2">
                    {formValues.goalWorkouts.map((row, index) => (
                      <div key={`${index}-${row.workoutId}`} className="grid grid-cols-[72px_1fr_auto] items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={366}
                          className="h-7 text-[11px]"
                          value={row.planDay}
                          onChange={(e) => updateGoalWorkoutRow(index, { planDay: e.target.value })}
                          placeholder="1–7"
                          title="Plan day: 1 = Monday, 7 = Sunday"
                        />
                        <select
                          className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                          value={row.workoutId}
                          onChange={(e) => updateGoalWorkoutRow(index, { workoutId: e.target.value })}
                        >
                          <option value="">Select workout</option>
                          {workouts.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => removeGoalWorkoutRow(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={addGoalWorkoutRow}
                    >
                      Add day workout
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="xs"
                  className="h-7 px-3 text-[11px]"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingGoal ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

