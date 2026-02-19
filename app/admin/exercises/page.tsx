"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type ExerciseRow = {
  id: string;
  name: string;
  category?: string | null;
  muscleGroup?: string | null;
  difficulty?: string | null;
};

export default function AdminExercisesPage() {
  const [rows, setRows] = React.useState<ExerciseRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingWorkout, setEditingWorkout] = React.useState<ExerciseRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    name: "",
    category: "",
    muscleGroup: "",
    difficulty: "",
  });
  const [saving, setSaving] = React.useState(false);

  const fetchData = React.useCallback(
    async (opts?: { page?: number; search?: string }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(opts?.page ?? page));
        params.set("pageSize", String(pageSize));
        if (opts?.search ?? search) {
          params.set("search", (opts?.search ?? search) as string);
        }
        const res = await fetch(`/api/admin/exercises?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        setRows(json.data ?? []);
        setTotal(json.total ?? 0);
        if (opts?.page) setPage(opts.page);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search],
  );

  React.useEffect(() => {
    void fetchData();
  }, []);

  const openNewDialog = () => {
    setEditingWorkout(null);
    setFormValues({
      name: "",
      category: "",
      muscleGroup: "",
      difficulty: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: ExerciseRow) => {
    setEditingWorkout(row);
    setFormValues({
      name: row.name,
      category: row.category ?? "",
      muscleGroup: row.muscleGroup ?? "",
      difficulty: row.difficulty ?? "",
    });
    setDialogOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formValues.name,
        category: formValues.category || null,
        muscleGroup: formValues.muscleGroup || null,
        difficulty: formValues.difficulty || null,
      };

      if (editingWorkout) {
        await fetch(`/api/admin/exercises/${editingWorkout.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Workout updated");
      } else {
        await fetch("/api/admin/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Workout created");
      }
      setDialogOpen(false);
      await fetchData({ page: 1, search });
    } catch {
      toast.error("Failed to save workout");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ExerciseRow>[] = [
    { key: "name", header: "Name" },
    { key: "category", header: "Category" },
    { key: "muscleGroup", header: "Muscle group" },
    { key: "difficulty", header: "Difficulty" },
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
                  Delete workout?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &quot;{row.name}&quot; from the workout
                  library. This action cannot be undone.
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
                      await fetch(`/api/admin/exercises/${row.id}`, {
                        method: "DELETE",
                      });
                      await fetchData({ page, search });
                      toast.success("Workout deleted");
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
          <h1 className="text-lg font-semibold">Workouts</h1>
          <p className="text-sm text-muted-foreground">
            Manage the workout exercise library.
          </p>
        </div>
        <Button
          size="xs"
          className="h-7 px-2 text-[11px]"
          onClick={openNewDialog}
        >
          New Workout
        </Button>
      </div>

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
              {editingWorkout ? "Edit Workout" : "New Workout"}
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
                <label className="font-medium" htmlFor="category">
                  Category
                </label>
                <Input
                  id="category"
                  name="category"
                  value={formValues.category}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  placeholder="e.g. Strength, Cardio"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="muscleGroup">
                  Muscle group
                </label>
                <Input
                  id="muscleGroup"
                  name="muscleGroup"
                  value={formValues.muscleGroup}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  placeholder="e.g. Chest, Legs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="difficulty">
                  Difficulty
                </label>
                <Input
                  id="difficulty"
                  name="difficulty"
                  value={formValues.difficulty}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  placeholder="e.g. Beginner, Advanced"
                />
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
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

