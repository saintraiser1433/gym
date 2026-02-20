"use client";

import * as React from "react";
import { format, getDay, startOfWeek, startOfDay } from "date-fns";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ScheduleEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type?: string;
  coachId?: string | null;
  coachName?: string;
  allowedMembershipTypes?: string[] | null;
};

type CoachOption = { id: string; name: string; email: string };

const locales = { "en-US": undefined };
const localizer = dateFnsLocalizer({
  format,
  getDay,
  startOfWeek,
  locales,
});

export default function AdminSchedulesPage() {
  const [events, setEvents] = React.useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [coaches, setCoaches] = React.useState<CoachOption[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<ScheduleEvent | null>(null);
  const [slotDate, setSlotDate] = React.useState<Date | null>(null);
  const [formValues, setFormValues] = React.useState({
    title: "",
    type: "CLASS",
    startTime: "",
    endTime: "",
    coachId: "",
    allowedMembershipTypes: [] as string[],
  });
  const [saving, setSaving] = React.useState(false);

  const scheduleToEvent = (
    s: {
      id: string;
      title?: string;
      type?: string;
      startTime?: string;
      endTime?: string;
      coachId?: string | null;
      coach?: { user?: { name?: string } };
      allowedMembershipTypes?: unknown;
    },
  ): ScheduleEvent => ({
    id: s.id,
    title: s.title ?? "Session",
    start: s.startTime ? new Date(s.startTime) : new Date(),
    end: s.endTime ? new Date(s.endTime) : new Date(),
    type: s.type,
    coachId: s.coachId,
    coachName: s.coach?.user?.name ?? "Unassigned",
    allowedMembershipTypes: Array.isArray(s.allowedMembershipTypes)
      ? (s.allowedMembershipTypes as string[])
      : null,
  });

  const fetchData = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/schedules?page=1&pageSize=500", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error((json as { error?: string }).error ?? "Failed to load schedules");
        return;
      }
      const data = json.data ?? [];
      setEvents(data.map((s: Parameters<typeof scheduleToEvent>[0]) => scheduleToEvent(s)));
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

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

  const openNewDialogForSlot = (start: Date, end: Date) => {
    setEditingSchedule(null);
    setSlotDate(startOfDay(start));
    setFormValues({
      title: "",
      type: "CLASS",
      startTime: format(start, "HH:mm"),
      endTime: format(end, "HH:mm"),
      coachId: "",
      allowedMembershipTypes: [],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (event: ScheduleEvent) => {
    setEditingSchedule(event);
    setSlotDate(startOfDay(event.start));
    setFormValues({
      title: event.title,
      type: (event as any).type ?? "CLASS",
      startTime: format(event.start, "HH:mm"),
      endTime: format(event.end, "HH:mm"),
      coachId: (event as any).coachId ?? "",
      allowedMembershipTypes: (event as any).allowedMembershipTypes ?? [],
    });
    setDialogOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMembershipType = (type: "BASIC" | "PREMIUM") => {
    setFormValues((prev) => {
      const current = prev.allowedMembershipTypes ?? [];
      const exists = current.includes(type);
      const next = exists ? current.filter((t) => t !== type) : [...current, type];
      // When Premium is not allowed (Basic only), remove coach
      const noPremium = !next.includes("PREMIUM");
      return {
        ...prev,
        allowedMembershipTypes: next,
        ...(noPremium ? { coachId: "" } : {}),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allowed = formValues.allowedMembershipTypes ?? [];
    if (allowed.length === 0) {
      toast.error("Select at least one allowed membership type (Basic or Premium).");
      return;
    }
    setSaving(true);
    try {
      const baseDate = slotDate ?? startOfDay(new Date());
      const [startHours, startMins] = formValues.startTime.split(":").map(Number);
      const [endHours, endMins] = formValues.endTime.split(":").map(Number);
      const start = new Date(baseDate);
      start.setHours(startHours, startMins ?? 0, 0, 0);
      const end = new Date(baseDate);
      end.setHours(endHours, endMins ?? 0, 0, 0);
      if (end <= start) end.setDate(end.getDate() + 1);
      const payload = {
        title: formValues.title,
        type: formValues.type,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        coachId: formValues.allowedMembershipTypes?.includes("PREMIUM")
          ? formValues.coachId || undefined
          : undefined,
        allowedMembershipTypes: allowed,
      };

      let res: Response;
      if (editingSchedule) {
        res = await fetch(`/api/admin/schedules/${editingSchedule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = (err as { error?: string }).error ?? "Failed to save schedule";
        toast.error(message);
        return;
      }

      const json = await res.json();
      const newEvent = scheduleToEvent(json);

      if (editingSchedule) {
        setEvents((prev) =>
          prev.map((e) => (e.id === editingSchedule.id ? newEvent : e)),
        );
      } else {
        setEvents((prev) => [
          { ...newEvent, start, end },
          ...prev,
        ]);
      }

      toast.success(editingSchedule ? "Schedule updated" : "Schedule created");
      setDialogOpen(false);
      await fetchData({ silent: true });
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
      await fetchData();
      toast.success("Schedule deleted");
    } finally {
      setLoading(false);
    }
  };

  const todayStart = startOfDay(new Date());
  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    if (slotInfo.start < todayStart) return;
    const end = slotInfo.end.getTime() - slotInfo.start.getTime() < 60 * 60 * 1000
      ? new Date(slotInfo.start.getTime() + 60 * 60 * 1000)
      : slotInfo.end;
    openNewDialogForSlot(slotInfo.start, end);
  };
  const dayPropGetter = (date: Date) => {
    if (date < todayStart) {
      return { className: "rbc-past-disabled", style: { pointerEvents: "none" as const, opacity: 0.6 } };
    }
    return {};
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Schedules</h1>
        <p className="text-sm text-muted-foreground">
          Click a date (today or later) to add a schedule. Click an event to edit.
        </p>
      </div>

      <Card className="p-3">
        <div className="h-[600px]">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading calendar…</p>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              titleAccessor="title"
              defaultView="month"
              views={["month", "week", "day", "agenda"]}
              popup
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={(event) => openEditDialog(event as ScheduleEvent)}
              dayPropGetter={dayPropGetter}
              className="rbc-calendar rounded-md border border-border bg-card text-foreground"
            />
          )}
        </div>
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
              {slotDate && (
                <p className="text-[11px] text-muted-foreground">
                  Date: {format(slotDate, "PPP")}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="startTime">
                    Start time
                  </label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    value={formValues.startTime}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="endTime">
                    End time
                  </label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="time"
                    value={formValues.endTime}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium">
                  Allowed membership types <span className="text-destructive">*</span>
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Required: select at least one (Basic and/or Premium).
                </p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={formValues.allowedMembershipTypes.includes("BASIC")}
                      onChange={() => toggleMembershipType("BASIC")}
                    />
                    <span>Basic</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={formValues.allowedMembershipTypes.includes("PREMIUM")}
                      onChange={() => toggleMembershipType("PREMIUM")}
                    />
                    <span>Premium</span>
                  </label>
                </div>
              </div>
              {formValues.allowedMembershipTypes.includes("PREMIUM") && (
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
              )}
              <div className="flex justify-end gap-2 pt-2">
                {editingSchedule && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="h-7 px-2 text-[11px] text-destructive"
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-sm">
                          Delete schedule?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove &quot;{editingSchedule.title}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="h-7 px-2 text-[11px]">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="h-7 px-3 text-[11px]"
                          onClick={() => {
                            void handleDelete(editingSchedule.id);
                            setDialogOpen(false);
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
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
