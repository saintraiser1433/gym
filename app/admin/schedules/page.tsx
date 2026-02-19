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

type ScheduleRow = {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  startTimeRaw: string;
  endTimeRaw: string;
  coachId: string | null;
  coachName: string;
  capacity: number | null;
  recurrence: string | null;
};

type CoachOption = { id: string; name: string; email: string };

export default function AdminSchedulesPage() {
  const [rows, setRows] = React.useState<ScheduleRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [coaches, setCoaches] = React.useState<CoachOption[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<ScheduleRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    title: "",
    type: "CLASS",
    startTime: "",
    endTime: "",
    coachId: "",
    capacity: "",
    recurrence: "",
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
        const res = await fetch(`/api/admin/schedules?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const data = json.data ?? [];
        setRows(
          data.map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.type,
            startTime: new Date(s.startTime).toLocaleString(),
            endTime: new Date(s.endTime).toLocaleString(),
            startTimeRaw: new Date(s.startTime).toISOString().slice(0, 16),
            endTimeRaw: new Date(s.endTime).toISOString().slice(0, 16),
            coachId: s.coachId ?? null,
            coachName: s.coach?.user?.name ?? "Unassigned",
            capacity: s.capacity ?? null,
            recurrence: s.recurrence ?? null,
          })),
        );
        setTotal(json.total ?? 0);
        if (opts?.page) setPage(opts.page);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search],
  );

  const fetchCoaches = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coaches", { cache: "no-store" });
      const json = await res.json();
      setCoaches(json.data ?? []);
    } catch {
      setCoaches([]);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
    void fetchCoaches();
  }, []);

  const openNewDialog = () => {
    setEditingSchedule(null);
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setFormValues({
      title: "",
      type: "CLASS",
      startTime: now.toISOString().slice(0, 16),
      endTime: end.toISOString().slice(0, 16),
      coachId: "",
      capacity: "",
      recurrence: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: ScheduleRow) => {
    setEditingSchedule(row);
    setFormValues({
      title: row.title,
      type: row.type,
      startTime: row.startTimeRaw,
      endTime: row.endTimeRaw,
      coachId: row.coachId ?? "",
      capacity: row.capacity != null ? String(row.capacity) : "",
      recurrence: row.recurrence ?? "",
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
      const start = new Date(formValues.startTime);
      const end = new Date(formValues.endTime);
      const payload = {
        title: formValues.title,
        type: formValues.type,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        coachId: formValues.coachId || undefined,
        capacity: formValues.capacity ? parseInt(formValues.capacity, 10) : undefined,
        recurrence: formValues.recurrence || undefined,
      };

      if (editingSchedule) {
        await fetch(`/api/admin/schedules/${editingSchedule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Schedule updated");
      } else {
        await fetch("/api/admin/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Schedule created");
      }
      setDialogOpen(false);
      await fetchData({ page: 1, search });
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ScheduleRow>[] = [
    { key: "title", header: "Title" },
    {
      key: "type",
      header: "Type",
      render: (row) =>
        row.type
          .split("_")
          .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
          .join(" "),
    },
    { key: "coachName", header: "Coach" },
    { key: "startTime", header: "Start Time" },
    { key: "endTime", header: "End Time" },
    {
      key: "capacity",
      header: "Capacity",
      render: (row) => (row.capacity ?? "—"),
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
            aria-label={`Edit ${row.title}`}
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
                aria-label={`Delete ${row.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Delete schedule?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &quot;{row.title}&quot;. This action cannot be undone.
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
                      await fetch(`/api/admin/schedules/${row.id}`, {
                        method: "DELETE",
                      });
                      await fetchData({ page, search });
                      toast.success("Schedule deleted");
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
          <h1 className="text-lg font-semibold">Schedules</h1>
          <p className="text-sm text-muted-foreground">
            View and manage workout class schedules.
          </p>
        </div>
        <Button
          size="xs"
          className="h-7 px-2 text-[11px]"
          onClick={openNewDialog}
        >
          New Schedule
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
          onPageChange={(newPage) => void fetchData({ page: newPage })}
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
              {editingSchedule ? "Edit Schedule" : "New Schedule"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="font-medium" htmlFor="title">
                  Title
                </label>
                <Input
                  id="title"
                  name="title"
                  value={formValues.title}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="type">
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formValues.type}
                  onChange={handleFormChange}
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                >
                  <option value="CLASS">Class</option>
                  <option value="PERSONAL_TRAINING">Personal training</option>
                  <option value="GYM_HOURS">Gym hours</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="startTime">
                    Start
                  </label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="datetime-local"
                    value={formValues.startTime}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="endTime">
                    End
                  </label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="datetime-local"
                    value={formValues.endTime}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="coachId">
                  Coach
                </label>
                <select
                  id="coachId"
                  name="coachId"
                  value={formValues.coachId}
                  onChange={handleFormChange}
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                >
                  <option value="">Unassigned</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="capacity">
                    Capacity
                  </label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min={1}
                    value={formValues.capacity}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="recurrence">
                    Recurrence
                  </label>
                  <Input
                    id="recurrence"
                    name="recurrence"
                    value={formValues.recurrence}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    placeholder="e.g. Weekly"
                  />
                </div>
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
