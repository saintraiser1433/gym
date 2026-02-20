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

type WorkoutRow = {
  id: string;
  name: string;
  description?: string | null;
  duration?: number | null;
  difficulty?: string | null;
  demoMediaUrl?: string | null;
};

const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Hard"] as const;
type DifficultyTab = "All" | (typeof DIFFICULTY_OPTIONS)[number];

export default function AdminWorkoutsPage() {
  const [difficultyTab, setDifficultyTab] = React.useState<DifficultyTab>("All");
  const [rows, setRows] = React.useState<WorkoutRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<WorkoutRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    name: "",
    description: "",
    duration: "",
    difficulty: "",
    demoMediaUrl: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/workouts", {
        cache: "no-store",
        credentials: "include",
      });
      const text = await res.text();
      let json: { data?: WorkoutRow[]; error?: string } | null = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      if (!res.ok) {
        toast.error(json?.error ?? `Failed to load workouts (${res.status})`);
        setRows([]);
        return;
      }
      setRows(json?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openNewDialog = () => {
    setEditingRow(null);
    setFormValues({
      name: "",
      description: "",
      duration: "",
      difficulty: "",
      demoMediaUrl: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: WorkoutRow) => {
    setEditingRow(row);
    setFormValues({
      name: row.name,
      description: row.description ?? "",
      duration: row.duration != null ? String(row.duration) : "",
      difficulty: row.difficulty ?? "",
      demoMediaUrl: row.demoMediaUrl ?? "",
    });
    setDialogOpen(true);
  };

  const handleDemoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/workouts/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error ?? "Upload failed");
        return;
      }
      setFormValues((prev) => ({ ...prev, demoMediaUrl: json.url ?? "" }));
      toast.success("File uploaded");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formValues.name.trim(),
        description: formValues.description.trim() || undefined,
        duration: formValues.duration ? Number(formValues.duration) : undefined,
        difficulty: formValues.difficulty.trim() || undefined,
        demoMediaUrl: formValues.demoMediaUrl.trim() || undefined,
      };
      const url = editingRow
        ? `/api/admin/workouts/${editingRow.id}`
        : "/api/admin/workouts";
      const res = await fetch(url, {
        method: editingRow ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let json: { error?: string } | null = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      if (!res.ok) {
        toast.error(json?.error ?? (editingRow ? "Failed to update workout" : "Failed to create workout"));
        return;
      }
      setDialogOpen(false);
      setEditingRow(null);
      await fetchData();
      toast.success(editingRow ? "Workout updated" : "Workout created");
    } finally {
      setSaving(false);
    }
  };

  const filteredRows =
    difficultyTab === "All"
      ? rows
      : rows.filter((r) => (r.difficulty ?? "").toLowerCase() === difficultyTab.toLowerCase());

  const columns: Column<WorkoutRow>[] = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description" },
    {
      key: "duration",
      header: "Duration (min)",
      render: (row) => row.duration ?? "—",
    },
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
                      await fetch(`/api/admin/workouts/${row.id}`, {
                        method: "DELETE",
                      });
                      await fetchData();
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
            Add and manage workout templates. These appear in Workout Goals when
            linking workouts to a goal.
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

      <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
        {(["All", ...DIFFICULTY_OPTIONS] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setDifficultyTab(tab)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              difficultyTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card className="p-3">
        <DataTable
          columns={columns}
          data={filteredRows}
          page={1}
          pageSize={filteredRows.length || 10}
          total={filteredRows.length}
          isLoading={loading}
          onPageChange={() => {}}
          onSearchChange={() => {}}
        />
      </Card>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">
              {editingRow ? "Edit Workout" : "New Workout"}
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="duration">
                    Duration (min)
                  </label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min={0}
                    value={formValues.duration}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="difficulty">
                    Difficulty
                  </label>
                  <select
                    id="difficulty"
                    name="difficulty"
                    value={formValues.difficulty}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        difficulty: e.target.value,
                      }))
                    }
                    className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  >
                    <option value="">Select...</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium">How to perform (GIF or video)</label>
                <p className="text-[10px] text-muted-foreground">
                  Upload a GIF or video (MP4, WebM, MOV) showing how to perform this workout.
                </p>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,image/gif,.mp4,.webm,.mov,.gif"
                  className="w-full text-[11px]"
                  disabled={uploading}
                  onChange={handleDemoFileChange}
                />
                {formValues.demoMediaUrl && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Preview:</p>
                    <div className="rounded-md border bg-muted/30 overflow-hidden max-h-40">
                      {formValues.demoMediaUrl.toLowerCase().endsWith(".gif") ? (
                        <img
                          src={formValues.demoMediaUrl}
                          alt="Demo"
                          className="h-full w-full object-contain max-h-40"
                        />
                      ) : (
                        <video
                          src={formValues.demoMediaUrl}
                          controls
                          className="h-full w-full object-contain max-h-40"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setFormValues((prev) => ({ ...prev, demoMediaUrl: "" }))}
                    >
                      Remove
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
                  {saving ? "Saving..." : editingRow ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
