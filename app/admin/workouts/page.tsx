"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type EquipmentOption = { id: string; name: string; measureTypes?: string[] };

type WorkoutEquipment = {
  equipmentId: string;
  equipmentName?: string;
  quantity: number;
  measureTypes?: string[];
  targetKg?: number | null;
  targetPcs?: number | null;
};

type WorkoutRow = {
  id: string;
  name: string;
  description?: string | null;
  duration?: number | null;
  difficulty?: string | null;
  demoMediaUrl?: string | null;
  equipment?: WorkoutEquipment[];
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
  const [equipmentEntries, setEquipmentEntries] = React.useState<Record<string, { quantity: number; targetKg: number | null; targetPcs: number | null }>>({});
  const [equipmentList, setEquipmentList] = React.useState<EquipmentOption[]>([]);
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
      let json: { data?: WorkoutRow[]; equipment?: { id: string; name: string; measureTypes?: string[] }[]; error?: string } | null = null;
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
      if (Array.isArray(json?.equipment)) {
        setEquipmentList(json.equipment.map((e) => ({ id: e.id, name: e.name, measureTypes: e.measureTypes ?? ["PER_PCS"] })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const fetchEquipment = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/equipment?page=1&pageSize=500", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const data = Array.isArray(json.data) ? json.data : [];
      setEquipmentList(data.map((e: { id: string; name: string; measureTypes?: string[] }) => ({ id: e.id, name: e.name, measureTypes: e.measureTypes ?? ["PER_PCS"] })));
    } catch {
      // Keep existing list (e.g. from workouts API) so we don't clear after navigation
    }
  }, []);

  // Preload equipment on mount so the list is ready when opening New/Edit workout
  React.useEffect(() => {
    void fetchEquipment();
  }, [fetchEquipment]);

  const openNewDialog = () => {
    setEditingRow(null);
    setFormValues({
      name: "",
      description: "",
      duration: "",
      difficulty: "",
      demoMediaUrl: "",
    });
    setEquipmentEntries({});
    setDialogOpen(true);
    void fetchEquipment();
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
    const entries: Record<string, { quantity: number; targetKg: number | null; targetPcs: number | null }> = {};
    (row.equipment ?? []).forEach((e) => {
      entries[e.equipmentId] = {
        quantity: e.quantity >= 1 ? e.quantity : 1,
        targetKg: e.targetKg ?? null,
        targetPcs: e.targetPcs ?? null,
      };
    });
    setEquipmentEntries(entries);
    setDialogOpen(true);
    void fetchEquipment();
  };

  const setEquipmentChecked = (equipmentId: string, checked: boolean) => {
    if (checked) {
      setEquipmentEntries((prev) => ({ ...prev, [equipmentId]: { quantity: 1, targetKg: null, targetPcs: null } }));
    } else {
      setEquipmentEntries((prev) => {
        const next = { ...prev };
        delete next[equipmentId];
        return next;
      });
    }
  };

  const setEquipmentQuantity = (equipmentId: string, quantity: number) => {
    setEquipmentEntries((prev) => ({
      ...prev,
      [equipmentId]: { ...(prev[equipmentId] ?? { quantity: 1, targetKg: null, targetPcs: null }), quantity: quantity < 1 ? 1 : quantity },
    }));
  };

  const setEquipmentTargetKg = (equipmentId: string, targetKg: number | null) => {
    setEquipmentEntries((prev) => ({
      ...prev,
      [equipmentId]: { ...(prev[equipmentId] ?? { quantity: 1, targetKg: null, targetPcs: null }), targetKg },
    }));
  };

  const setEquipmentTargetPcs = (equipmentId: string, targetPcs: number | null) => {
    setEquipmentEntries((prev) => ({
      ...prev,
      [equipmentId]: { ...(prev[equipmentId] ?? { quantity: 1, targetKg: null, targetPcs: null }), targetPcs },
    }));
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
      const equipmentPayload = Object.entries(equipmentEntries)
        .filter(([, v]) => v.quantity >= 1)
        .map(([equipmentId, v]) => ({
          equipmentId,
          quantity: Math.max(1, v.quantity),
          targetKg: v.targetKg,
          targetPcs: v.targetPcs,
        }));
      const payload = {
        name: formValues.name.trim(),
        description: formValues.description.trim() || undefined,
        duration: formValues.duration ? Number(formValues.duration) : undefined,
        difficulty: formValues.difficulty.trim() || undefined,
        demoMediaUrl: formValues.demoMediaUrl.trim() || undefined,
        equipment: equipmentPayload,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-md bg-card shadow-lg">
            <h2 className="shrink-0 border-b px-4 py-3 text-sm font-semibold">
              {editingRow ? "Edit Workout" : "New Workout"}
            </h2>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-[11px]">
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
                  <Select
                    value={formValues.difficulty}
                    onValueChange={(val) =>
                      setFormValues((prev) => ({ ...prev, difficulty: val }))
                    }
                  >
                    <SelectTrigger id="difficulty" size="sm" className="text-[11px]">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-medium">Equipment used</label>
                <p className="text-[10px] text-muted-foreground">
                  Select equipment. KG / PCS fields appear based on options set in Equipment.
                </p>
                {equipmentList.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No equipment in the system. Add some in Admin → Equipment.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border bg-muted/20 p-2">
                    {equipmentList.map((eq) => {
                      const entry = equipmentEntries[eq.id];
                      const checked = !!entry && entry.quantity >= 1;
                      const types = eq.measureTypes ?? ["PER_PCS"];
                      const hasKg = types.includes("PER_KG");
                      const hasPcs = types.includes("PER_PCS");
                      return (
                        <div key={eq.id} className="space-y-1.5 rounded border p-2 text-[11px]">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`eq-${eq.id}`}
                              checked={checked}
                              onChange={(e) => setEquipmentChecked(eq.id, e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-input"
                            />
                            <label htmlFor={`eq-${eq.id}`} className="font-medium">
                              {eq.name}
                            </label>
                          </div>
                          {checked && (
                            <div className="flex flex-wrap items-center gap-3 pl-5">
                              {/* Pieces quantity: only when equipment has both KG and PCS (not when per-piece or per-kg only) */}
                              {hasKg && hasPcs && (
                                <label className="flex items-center gap-1">
                                  <span className="text-[10px] text-muted-foreground">Pieces:</span>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={entry?.quantity ?? 1}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      setEquipmentQuantity(eq.id, isNaN(v) || v < 1 ? 1 : v);
                                    }}
                                    className="h-6 w-14 px-1 text-[11px]"
                                  />
                                </label>
                              )}
                              {hasKg && (
                                <>
                                  <label className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">KG</span>
                                    <Input
                                      type="number"
                                      step="any"
                                      min={0}
                                      value={entry?.targetKg ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? null : parseFloat(e.target.value);
                                        setEquipmentTargetKg(eq.id, v === null ? null : (isNaN(v) ? null : v));
                                      }}
                                      placeholder="kg"
                                      className="h-6 w-16 px-1 text-[11px]"
                                    />
                                  </label>
                                  <label className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">PCS</span>
                                    <Input
                                      type="number"
                                      step="any"
                                      min={0}
                                      value={entry?.targetPcs ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value === "" ? null : parseFloat(e.target.value);
                                        setEquipmentTargetPcs(eq.id, v === null ? null : (isNaN(v) ? null : v));
                                      }}
                                      placeholder="pcs"
                                      className="h-6 w-16 px-1 text-[11px]"
                                    />
                                  </label>
                                </>
                              )}
                              {hasPcs && !hasKg && (
                                <label className="flex items-center gap-1">
                                  <span className="text-[10px] text-muted-foreground">PCS</span>
                                  <Input
                                    type="number"
                                    step="any"
                                    min={0}
                                    value={entry?.targetPcs ?? ""}
                                    onChange={(e) => {
                                      const v = e.target.value === "" ? null : parseFloat(e.target.value);
                                      setEquipmentTargetPcs(eq.id, v === null ? null : (isNaN(v) ? null : v));
                                    }}
                                    placeholder="pcs"
                                    className="h-6 w-16 px-1 text-[11px]"
                                  />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
              </div>
              <div className="shrink-0 flex justify-end gap-2 border-t px-4 py-3">
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
