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
  baseTitle: string;
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

function ScheduleEventComponent({ event }: { event: ScheduleEvent }) {
  const timeRange = `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`;
  const isPremiumOnly =
    Array.isArray(event.allowedMembershipTypes) &&
    event.allowedMembershipTypes.length === 1 &&
    event.allowedMembershipTypes[0] === "PREMIUM";
  return (
    <div className="flex flex-col gap-0.5 overflow-hidden text-left">
      <span className="truncate font-medium" title={event.title}>
        {event.baseTitle} · {timeRange}
      </span>
      <span className="text-[10px] opacity-90">Coach: {event.coachName ?? "Unassigned"}</span>
      {isPremiumOnly && (
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Exclusive: Premium</span>
      )}
    </div>
  );
}

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
    timeSlots: [] as { startTime: string; endTime: string; coachId: string }[],
    coachId: "",
    allowedMembershipTypes: [] as string[],
  });
  const [saving, setSaving] = React.useState(false);
  const [dayModalDate, setDayModalDate] = React.useState<Date | null>(null);

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
  ): ScheduleEvent => {
    const start = s.startTime ? new Date(s.startTime) : new Date();
    const rawEnd = s.endTime ? new Date(s.endTime) : new Date();
    let end = rawEnd;
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    // Clamp end to 23:59:59 of the start day so the event never
    // renders as a multi-day bar spanning into the next column.
    const startDayEnd = new Date(start);
    startDayEnd.setHours(23, 59, 59, 999);
    if (end > startDayEnd) {
      end = startDayEnd;
    }
    const coachName = s.coach?.user?.name ?? "Unassigned";
    const timeRange = `${format(start, "h:mm a")} – ${format(rawEnd, "h:mm a")}`;
    const baseTitle = s.title ?? "Session";
    return {
      id: s.id,
      title: `${baseTitle} • ${timeRange} • ${coachName}`,
      baseTitle,
      start,
      end,
      type: s.type,
      coachId: s.coachId,
      coachName,
      allowedMembershipTypes: Array.isArray(s.allowedMembershipTypes)
        ? (s.allowedMembershipTypes as string[])
        : null,
    };
  };

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
    const startTime = format(start, "HH:mm");
    const endTime = format(end, "HH:mm");
    setFormValues({
      title: "",
      type: "CLASS",
      startTime,
      endTime,
      timeSlots: [{ startTime, endTime, coachId: "" }],
      coachId: "",
      allowedMembershipTypes: [],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (event: ScheduleEvent) => {
    setEditingSchedule(event);
    setSlotDate(startOfDay(event.start));
    setFormValues({
      title: event.baseTitle,
      type: (event as any).type ?? "CLASS",
      startTime: format(event.start, "HH:mm"),
      endTime: format(event.end, "HH:mm"),
      timeSlots: [],
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
      // When Premium is not allowed (Basic only), clear coach(s)
      const noPremium = !next.includes("PREMIUM");
      return {
        ...prev,
        allowedMembershipTypes: next,
        ...(noPremium
          ? {
              coachId: "",
              timeSlots: prev.timeSlots.map((s) => ({ ...s, coachId: "" })),
            }
          : {}),
      };
    });
  };

  const slotsToCreate = (): { start: Date; end: Date; coachId: string }[] => {
    const baseDate = slotDate ?? startOfDay(new Date());
    const slots = formValues.timeSlots?.length
      ? formValues.timeSlots
      : [{ startTime: formValues.startTime, endTime: formValues.endTime, coachId: formValues.coachId }];
    return slots.map((slot) => {
      const [startHours, startMins] = slot.startTime.split(":").map(Number);
      const [endHours, endMins] = slot.endTime.split(":").map(Number);
      const start = new Date(baseDate);
      start.setHours(startHours, startMins ?? 0, 0, 0);
      const end = new Date(baseDate);
      end.setHours(endHours, endMins ?? 0, 0, 0);
      // same time → bump 1 hr; end earlier in the day (overnight) → next day
      if (end.getTime() === start.getTime()) {
        end.setHours(end.getHours() + 1);
      } else if (end < start) {
        end.setDate(end.getDate() + 1);
      }
      const coachId = "coachId" in slot ? (slot.coachId ?? "") : formValues.coachId;
      return { start, end, coachId };
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
      if (editingSchedule) {
        const slots = slotsToCreate();
        const { start, end } = slots[0]!;
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
        const res = await fetch(`/api/admin/schedules/${editingSchedule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error ?? "Failed to save schedule");
          return;
        }
        const json = await res.json();
        const newEvent = scheduleToEvent(json);
        setEvents((prev) =>
          prev.map((e) => (e.id === editingSchedule.id ? newEvent : e)),
        );
        toast.success("Schedule updated");
        setDialogOpen(false);
        await fetchData({ silent: true });
        return;
      }

      const slots = slotsToCreate();
      let created = 0;
      const canAssignCoach = formValues.allowedMembershipTypes?.includes("PREMIUM");
      for (const { start, end, coachId: slotCoachId } of slots) {
        const payload = {
          title: formValues.title,
          type: formValues.type,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          coachId: canAssignCoach ? (slotCoachId || undefined) : undefined,
          allowedMembershipTypes: allowed,
        };
        const res = await fetch("/api/admin/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          const newEvent = scheduleToEvent(json);
          setEvents((prev) => [{ ...newEvent, start, end }, ...prev]);
          created++;
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error ?? "Failed to create schedule");
        }
      }
      if (created > 0) {
        toast.success(created === 1 ? "Schedule created" : `${created} schedules created`);
        setDialogOpen(false);
        await fetchData({ silent: true });
      }
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
    setDayModalDate(startOfDay(slotInfo.start));
  };

  const dayModalSchedules = React.useMemo(() => {
    if (!dayModalDate) return [];
    const dayStart = dayModalDate.getTime();
    return events.filter((e) => startOfDay(e.start).getTime() === dayStart);
  }, [dayModalDate, events]);

  const openAddScheduleForDay = () => {
    if (!dayModalDate) return;
    const start = new Date(dayModalDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(dayModalDate);
    end.setHours(10, 0, 0, 0);
    openNewDialogForSlot(start, end);
    setDayModalDate(null);
  };

  const openEditFromDayModal = (event: ScheduleEvent) => {
    setDayModalDate(null);
    openEditDialog(event);
  };
  const dayPropGetter = (date: Date) => {
    if (date < todayStart) {
      return { className: "rbc-past-disabled", style: { pointerEvents: "none" as const } };
    }
    return {};
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Schedules</h1>
        <p className="text-sm text-muted-foreground">
          Click a date (today or later) to view or manage that day&apos;s schedules. Click an event to edit.
        </p>
      </div>

      <Card className="p-3">
        <div style={{ height: 640 }}>
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
              dayLayoutAlgorithm="no-overlap"
              components={{
                event: (props) => <ScheduleEventComponent event={props.event as ScheduleEvent} />,
              }}
              style={{ height: "100%" }}
            />
          )}
        </div>
      </Card>

      {dayModalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">
              Schedules for {format(dayModalDate, "PPP")}
            </h2>
            {dayModalSchedules.length === 0 ? (
              <p className="mb-3 text-xs text-muted-foreground">No schedules on this date.</p>
            ) : (
              <ul className="mb-3 max-h-[320px] space-y-2 overflow-y-auto">
                {dayModalSchedules
                  .slice()
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map((ev) => (
                    <li
                      key={ev.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 p-2 text-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{ev.baseTitle}</span>
                        <span className="ml-1 text-muted-foreground">
                          {format(ev.start, "h:mm a")} – {format(ev.end, "h:mm a")}
                        </span>
                        <span className="ml-1 text-muted-foreground">· {ev.coachName ?? "Unassigned"}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => openEditFromDayModal(ev)}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-destructive"
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-sm">Delete schedule?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove &quot;{ev.baseTitle}&quot; ({format(ev.start, "h:mm a")} – {format(ev.end, "h:mm a")})?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="h-7 px-2 text-[11px]">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="h-7 px-3 text-[11px]"
                                onClick={async () => {
                                  await handleDelete(ev.id);
                                  setDayModalDate(null);
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => setDayModalDate(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 text-[11px]"
                onClick={openAddScheduleForDay}
              >
                Add schedule
              </Button>
            </div>
          </div>
        </div>
      )}

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
              {editingSchedule ? (
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
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium">Time slots (same date)</label>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      onClick={() =>
                        setFormValues((prev) => ({
                          ...prev,
                          timeSlots: [
                            ...(prev.timeSlots.length ? prev.timeSlots : [{ startTime: prev.startTime, endTime: prev.endTime, coachId: prev.coachId }]),
                            { startTime: "09:00", endTime: "10:00", coachId: "" },
                          ],
                        }))
                      }
                    >
                      + Add slot
                    </Button>
                  </div>
                  {(formValues.timeSlots.length ? formValues.timeSlots : [{ startTime: formValues.startTime, endTime: formValues.endTime, coachId: formValues.coachId }]).map(
                    (slot, i) => {
                      const effectiveSlots = formValues.timeSlots.length
                        ? formValues.timeSlots
                        : [{ startTime: formValues.startTime, endTime: formValues.endTime, coachId: formValues.coachId }];
                      const canRemove = effectiveSlots.length > 1;
                      const slotCoachId = "coachId" in slot ? slot.coachId : formValues.coachId;
                      const isPremium = formValues.allowedMembershipTypes?.includes("PREMIUM");
                      return (
                        <div key={i} className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-2">
                          <div className="flex items-end gap-2">
                            <div className="grid flex-1 grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-medium text-muted-foreground">Start</label>
                                <Input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (formValues.timeSlots.length) {
                                      setFormValues((prev) => ({
                                        ...prev,
                                        timeSlots: prev.timeSlots.map((s, j) => (j === i ? { ...s, startTime: v } : s)),
                                      }));
                                    } else {
                                      setFormValues((prev) => ({ ...prev, startTime: v }));
                                    }
                                  }}
                                  className="h-7 text-[11px]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-medium text-muted-foreground">End</label>
                                <Input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (formValues.timeSlots.length) {
                                      setFormValues((prev) => ({
                                        ...prev,
                                        timeSlots: prev.timeSlots.map((s, j) => (j === i ? { ...s, endTime: v } : s)),
                                      }));
                                    } else {
                                      setFormValues((prev) => ({ ...prev, endTime: v }));
                                    }
                                  }}
                                  className="h-7 text-[11px]"
                                />
                              </div>
                            </div>
                            {canRemove && (
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                className="h-7 shrink-0 px-2 text-[10px] text-destructive"
                                onClick={() => {
                                  if (formValues.timeSlots.length) {
                                    setFormValues((prev) => ({
                                      ...prev,
                                      timeSlots: prev.timeSlots.filter((_, j) => j !== i),
                                    }));
                                  } else {
                                    setFormValues((prev) => ({
                                      ...prev,
                                      timeSlots: [],
                                      startTime: "09:00",
                                      endTime: "10:00",
                                    }));
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          {isPremium && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Coach (this slot)</label>
                              <select
                                value={slotCoachId}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (formValues.timeSlots.length) {
                                    setFormValues((prev) => ({
                                      ...prev,
                                      timeSlots: prev.timeSlots.map((s, j) => (j === i ? { ...s, coachId: v } : s)),
                                    }));
                                  } else {
                                    setFormValues((prev) => ({ ...prev, coachId: v }));
                                  }
                                }}
                                className="h-7 w-full rounded-md border border-input bg-background px-2 text-[11px]"
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
                        </div>
                      );
                    },
                  )}
                </div>
              )}
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
              {editingSchedule && formValues.allowedMembershipTypes.includes("PREMIUM") && (
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
