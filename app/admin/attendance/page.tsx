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

type AttendanceRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  scheduleTitle: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  checkOutTimeRaw: string | null;
  method: string;
};

type ClientOption = { id: string; name: string; email: string };
type ScheduleOption = { id: string; title: string };

export default function AdminAttendancePage() {
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [clients, setClients] = React.useState<ClientOption[]>([]);
  const [schedules, setSchedules] = React.useState<ScheduleOption[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = React.useState(false);
  const [editingAttendance, setEditingAttendance] = React.useState<AttendanceRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    clientId: "",
    scheduleId: "",
    checkInTime: "",
    checkOutTime: "",
  });
  const [checkOutTime, setCheckOutTime] = React.useState("");
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
        const res = await fetch(`/api/admin/attendance?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const data = json.data ?? [];
        setRows(
          data.map((r: any) => ({
            id: r.id,
            clientName: r.client?.user?.name ?? "Unknown",
            clientEmail: r.client?.user?.email ?? "",
            scheduleTitle: r.schedule?.title ?? null,
            checkInTime: new Date(r.checkInTime).toLocaleString(),
            checkOutTime: r.checkOutTime
              ? new Date(r.checkOutTime).toLocaleString()
              : null,
            checkOutTimeRaw: r.checkOutTime
              ? new Date(r.checkOutTime).toISOString().slice(0, 16)
              : null,
            method: r.method ?? "QR",
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

  const fetchClients = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients", { cache: "no-store" });
      const json = await res.json();
      setClients(json.data ?? []);
    } catch {
      setClients([]);
    }
  }, []);

  const fetchSchedules = React.useCallback(async () => {
    try {
      // pageSize max is 100 in API; fetch first 100 for dropdown
      const res = await fetch("/api/admin/schedules?page=1&pageSize=100", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setSchedules([]);
        return;
      }
      setSchedules((json.data ?? []).map((s: any) => ({ id: s.id, title: s.title })));
    } catch {
      setSchedules([]);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
    void fetchClients();
    void fetchSchedules();
  }, []);

  const openNewDialog = () => {
    const now = new Date();
    setFormValues({
      clientId: "",
      scheduleId: "",
      checkInTime: now.toISOString().slice(0, 16),
      checkOutTime: "",
    });
    setEditingAttendance(null);
    setDialogOpen(true);
  };

  const openCheckOutDialog = (row: AttendanceRow) => {
    setEditingAttendance(row);
    setCheckOutTime(
      row.checkOutTimeRaw ?? new Date().toISOString().slice(0, 16),
    );
    setCheckOutDialogOpen(true);
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        clientId: formValues.clientId,
        scheduleId: formValues.scheduleId || undefined,
        checkInTime: formValues.checkInTime
          ? new Date(formValues.checkInTime).toISOString()
          : undefined,
        checkOutTime: formValues.checkOutTime
          ? new Date(formValues.checkOutTime).toISOString()
          : undefined,
        method: "MANUAL" as const,
      };
      await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setDialogOpen(false);
      await fetchData({ page: 1, search });
      toast.success("Attendance recorded");
    } catch {
      toast.error("Failed to record attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/attendance/${editingAttendance.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkOutTime: new Date(checkOutTime).toISOString(),
        }),
      });
      setCheckOutDialogOpen(false);
      await fetchData({ page, search });
      toast.success("Check-out time updated");
    } catch {
      toast.error("Failed to update check-out");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AttendanceRow>[] = [
    { key: "clientName", header: "Client" },
    { key: "clientEmail", header: "Email" },
    {
      key: "scheduleTitle",
      header: "Schedule",
      render: (row) => row.scheduleTitle ?? "—",
    },
    { key: "checkInTime", header: "Check-in" },
    {
      key: "checkOutTime",
      header: "Check-out",
      render: (row) => row.checkOutTime ?? "—",
    },
    { key: "method", header: "Method" },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            className="h-7 w-7 p-0"
            aria-label={`Edit check-out ${row.clientName}`}
            onClick={() => openCheckOutDialog(row)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="xs"
                variant="outline"
                className="h-7 w-7 p-0"
                aria-label={`Delete attendance ${row.clientName}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Delete attendance record?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the check-in record for {row.clientName}. This
                  action cannot be undone.
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
                      await fetch(`/api/admin/attendance/${row.id}`, {
                        method: "DELETE",
                      });
                      await fetchData({ page, search });
                      toast.success("Attendance record deleted");
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
          <h1 className="text-lg font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            View all client check-ins and check-outs. Add manual check-in or set
            check-out time.
          </p>
        </div>
        <Button
          size="xs"
          className="h-7 px-2 text-[11px]"
          onClick={openNewDialog}
        >
          New Attendance
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
            <h2 className="mb-3 text-sm font-semibold">Manual check-in</h2>
            <form onSubmit={handleSubmitNew} className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="font-medium" htmlFor="clientId">
                  Client
                </label>
                <select
                  id="clientId"
                  name="clientId"
                  value={formValues.clientId}
                  onChange={(e) =>
                    setFormValues((p) => ({ ...p, clientId: e.target.value }))
                  }
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="scheduleId">
                  Schedule (optional)
                </label>
                <select
                  id="scheduleId"
                  name="scheduleId"
                  value={formValues.scheduleId}
                  onChange={(e) =>
                    setFormValues((p) => ({ ...p, scheduleId: e.target.value }))
                  }
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                >
                  <option value="">None</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="checkInTime">
                  Check-in time
                </label>
                <Input
                  id="checkInTime"
                  name="checkInTime"
                  type="datetime-local"
                  value={formValues.checkInTime}
                  onChange={(e) =>
                    setFormValues((p) => ({ ...p, checkInTime: e.target.value }))
                  }
                  className="h-7 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="checkOutTime">
                  Check-out time (optional)
                </label>
                <Input
                  id="checkOutTime"
                  name="checkOutTime"
                  type="datetime-local"
                  value={formValues.checkOutTime}
                  onChange={(e) =>
                    setFormValues((p) => ({ ...p, checkOutTime: e.target.value }))
                  }
                  className="h-7 text-[11px]"
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

      {checkOutDialogOpen && editingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">Set check-out time</h2>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {editingAttendance.clientName}
            </p>
            <form onSubmit={handleSubmitCheckOut} className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="font-medium" htmlFor="checkOutTime">
                  Check-out time
                </label>
                <Input
                  id="checkOutTime"
                  type="datetime-local"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="h-7 text-[11px]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setCheckOutDialogOpen(false)}
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
