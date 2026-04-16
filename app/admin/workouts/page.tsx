"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  media?: {
    id: string;
    url: string;
    stepName?: string | null;
    description?: string | null;
    mediaType: "GIF" | "VIDEO";
    durationSeconds: number;
    order: number;
  }[];
  equipment?: WorkoutEquipment[];
};

const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Hard"] as const;
type DifficultyTab = "All" | (typeof DIFFICULTY_OPTIONS)[number];
type MediaEntry = {
  url: string;
  stepName: string;
  description: string;
  mediaType: "GIF" | "VIDEO";
  hours: string;
  minutes: string;
  seconds: string;
};

const emptyMediaEntry = (): MediaEntry => ({
  url: "",
  stepName: "",
  description: "",
  mediaType: "GIF",
  hours: "",
  minutes: "",
  seconds: "",
});

const mediaEntryToTotalSeconds = (entry: Pick<MediaEntry, "hours" | "minutes" | "seconds">) => {
  const hours = Number(entry.hours || 0);
  const minutes = Number(entry.minutes || 0);
  const seconds = Number(entry.seconds || 0);
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  return safeHours * 3600 + safeMinutes * 60 + safeSeconds;
};

const secondsToMediaEntryTime = (totalSeconds: number) => {
  const safeTotal = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;
  return {
    hours: hours > 0 ? String(hours) : "",
    minutes: minutes > 0 ? String(minutes) : "",
    seconds: seconds > 0 ? String(seconds) : "",
  };
};

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
  });
  const [mediaEntries, setMediaEntries] = React.useState<MediaEntry[]>([emptyMediaEntry()]);
  const [equipmentEntries, setEquipmentEntries] = React.useState<Record<string, { quantity: number; targetKg: number | null; targetPcs: number | null }>>({});
  const [equipmentList, setEquipmentList] = React.useState<EquipmentOption[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const totalDurationMinutes = React.useMemo(() => {
    const totalSeconds = mediaEntries.reduce((sum, entry) => {
      return sum + mediaEntryToTotalSeconds(entry);
    }, 0);
    if (totalSeconds <= 0) return "";
    const totalMinutes = totalSeconds / 60;
    return Number.isInteger(totalMinutes) ? String(totalMinutes) : totalMinutes.toFixed(1);
  }, [mediaEntries]);

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
    });
    setMediaEntries([emptyMediaEntry()]);
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
    });
    const rowMedia =
      (row.media ?? []).length > 0
        ? (row.media ?? []).map((m) => ({
            url: m.url,
            stepName: m.stepName ?? "",
            description: m.description ?? "",
            mediaType: m.mediaType,
            ...secondsToMediaEntryTime(m.durationSeconds),
          }))
        : row.demoMediaUrl
          ? [{
              url: row.demoMediaUrl,
              stepName: "",
              description: "",
              mediaType: row.demoMediaUrl.toLowerCase().endsWith(".gif") ? "GIF" : "VIDEO",
              ...secondsToMediaEntryTime((row.duration ?? 1) * 60),
            }]
          : [emptyMediaEntry()];
    setMediaEntries(rowMedia);
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

  const addMediaRow = () => {
    setMediaEntries((prev) => [...prev, emptyMediaEntry()]);
  };

  const removeMediaRow = (index: number) => {
    setMediaEntries((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const updateMediaEntry = (
    index: number,
    patch: Partial<MediaEntry>,
  ) => {
    setMediaEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  };

  const handleDemoFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
      updateMediaEntry(index, { url: json.url ?? "" });
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
      const mediaPayload = mediaEntries
        .map((entry, index) => ({
          url: entry.url.trim(),
          stepName: entry.stepName.trim() || undefined,
          description: entry.description.trim() || undefined,
          mediaType: entry.mediaType,
          durationSeconds: mediaEntryToTotalSeconds(entry),
          order: index,
        }))
        .filter((m) => m.url.length > 0);
      if (mediaPayload.length > 0 && mediaPayload.some((m) => !Number.isFinite(m.durationSeconds) || m.durationSeconds <= 0)) {
        toast.error("Each GIF/media item must have a duration in seconds greater than 0");
        return;
      }
      const payload = {
        name: formValues.name.trim(),
        description: formValues.description.trim() || undefined,
        duration: totalDurationMinutes ? Number(totalDurationMinutes) : undefined,
        difficulty: formValues.difficulty.trim() || undefined,
        demoMediaUrl: mediaPayload[0]?.url || undefined,
        media: mediaPayload,
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
    <div suppressHydrationWarning className="space-y-4">
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
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-md bg-card shadow-lg">
            <h2 className="shrink-0 border-b px-4 py-3 text-sm font-semibold">
              {editingRow ? "Edit Workout" : "New Workout"}
            </h2>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-[11px]">
                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="space-y-4 rounded-lg border bg-muted/10 p-4">
                    <div>
                      <h3 className="text-sm font-semibold">Workout details</h3>
                      <p className="text-[10px] text-muted-foreground">
                        Main workout information and equipment setup.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="font-medium" htmlFor="name">
                          Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          value={formValues.name}
                          onChange={handleFormChange}
                          className="h-9 text-[11px]"
                          required
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
                          <SelectTrigger id="difficulty" size="sm" className="h-9 text-[11px]">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="font-medium" htmlFor="description">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          value={formValues.description}
                          onChange={handleFormChange}
                          className="min-h-24 w-full rounded-md border bg-background px-2 py-2 text-[11px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-medium" htmlFor="duration">
                          Total duration (min)
                        </label>
                        <Input
                          id="duration"
                          name="duration"
                          type="number"
                          min={0}
                          value={totalDurationMinutes}
                          disabled
                          className="h-9 text-[11px] bg-muted"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Calculated automatically from the total step seconds below.
                        </p>
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
                        <div className="max-h-80 overflow-y-auto space-y-2 rounded-md border bg-muted/20 p-2">
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
                  </section>
                  <section className="space-y-4 rounded-lg border bg-muted/10 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">How to perform details</h3>
                        <p className="text-[10px] text-muted-foreground">
                          Add ordered GIF/video steps. Total duration is based on these steps.
                        </p>
                      </div>
                      <Button type="button" size="xs" variant="outline" className="h-7 px-2 text-[10px]" onClick={addMediaRow}>
                        <Plus className="mr-1 h-3 w-3" />
                        Add GIF/Media
                      </Button>
                    </div>
                    <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium">How to perform (GIF or video)</label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Add media items dynamically. Each item requires seconds to execute.
                </p>
                <div className="space-y-2">
                  {mediaEntries.map((entry, index) => (
                    <div key={`media-${index}`} className="space-y-2 rounded-md border p-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">URL</label>
                          <Input
                            value={entry.url}
                            onChange={(e) => updateMediaEntry(index, { url: e.target.value })}
                            className="h-7 text-[11px]"
                            placeholder="/uploads/workouts/example.gif"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Step time</label>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={entry.hours}
                              onChange={(e) => updateMediaEntry(index, { hours: e.target.value })}
                              className="h-7 text-[11px]"
                              placeholder="Hour"
                            />
                            <Input
                              type="number"
                              min={0}
                              value={entry.minutes}
                              onChange={(e) => updateMediaEntry(index, { minutes: e.target.value })}
                              className="h-7 text-[11px]"
                              placeholder="Min"
                            />
                            <Input
                              type="number"
                              min={0}
                              value={entry.seconds}
                              onChange={(e) => updateMediaEntry(index, { seconds: e.target.value })}
                              className="h-7 text-[11px]"
                              placeholder="Sec"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Step name</label>
                        <Input
                          value={entry.stepName}
                          onChange={(e) => updateMediaEntry(index, { stepName: e.target.value })}
                          className="h-7 text-[11px]"
                          placeholder={`Step ${index + 1} title`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Step description</label>
                        <textarea
                          value={entry.description}
                          onChange={(e) => updateMediaEntry(index, { description: e.target.value })}
                          className="min-h-16 w-full rounded-md border bg-background px-2 py-1 text-[11px]"
                          placeholder="e.g. Keep your back straight while lifting"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={entry.mediaType}
                          onValueChange={(val) =>
                            updateMediaEntry(index, { mediaType: val === "VIDEO" ? "VIDEO" : "GIF" })
                          }
                        >
                          <SelectTrigger size="sm" className="text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GIF">GIF</SelectItem>
                            <SelectItem value="VIDEO">VIDEO</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center">
                          <input
                            id={`media-upload-${index}`}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime,image/gif,.mp4,.webm,.mov,.gif"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => void handleDemoFileChange(index, e)}
                          />
                          <label
                            htmlFor={`media-upload-${index}`}
                            className={`inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-primary px-2 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 ${
                              uploading ? "pointer-events-none opacity-60" : ""
                            }`}
                          >
                            {uploading ? "Uploading..." : "Choose GIF/Video"}
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {entry.url && (
                          <div className="rounded-md border bg-muted/30 overflow-hidden max-h-24 w-28">
                            {entry.url.toLowerCase().endsWith(".gif") ? (
                              <img src={entry.url} alt="Demo" className="h-full w-full object-contain max-h-24" />
                            ) : (
                              <video src={entry.url} controls className="h-full w-full object-contain max-h-24" />
                            )}
                          </div>
                        )}
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="h-6 px-2 text-[10px] ml-auto"
                          onClick={() => removeMediaRow(index)}
                          disabled={mediaEntries.length <= 1}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                    </div>
                  </section>
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
