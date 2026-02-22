"use client";

import * as React from "react";
import { format, getDay, startOfDay, startOfWeek, formatDistanceToNow } from "date-fns";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { RequireMembership } from "@/components/require-membership";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ScheduleEvent = {
  id: string;
  title: string;
  baseTitle: string;
  coachName: string;
  start: Date;
  end: Date;
  type?: string;
};

type OpenAttendance = {
  id: string;
  scheduleId: string | null;
  checkInTime: string;
  schedule: { id: string; title: string; startTime: string; endTime: string } | null;
};

type AttendanceStatus = "none" | "checked_in" | "completed";

const locales = { "en-US": undefined };
const localizer = dateFnsLocalizer({
  format,
  getDay,
  startOfWeek,
  locales,
});

function ScheduleEventComponent({ event }: { event: ScheduleEvent }) {
  const timeRange = `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`;
  return (
    <div className="flex flex-col gap-0.5 overflow-hidden text-left">
      <span className="truncate font-medium" title={event.title}>
        {event.baseTitle} · {timeRange}
      </span>
      <span className="text-[10px] opacity-90">Coach: {event.coachName}</span>
    </div>
  );
}

export default function ClientSchedulesPage() {
  const [events, setEvents] = React.useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasCoach, setHasCoach] = React.useState(false);
  const [openAttendances, setOpenAttendances] = React.useState<OpenAttendance[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<ScheduleEvent | null>(null);
  const [attendanceStatus, setAttendanceStatus] = React.useState<AttendanceStatus | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const completedToastShown = React.useRef(false);

  const dayPropGetter = (date: Date) =>
    date < startOfDay(new Date()) ? { className: "rbc-past-day" } : {};

  const loadData = React.useCallback(async () => {
    try {
      const [schedRes, memberRes, openRes] = await Promise.all([
        fetch("/api/client/schedules", { cache: "no-store" }),
        fetch("/api/client/me/membership", { cache: "no-store" }),
        fetch("/api/client/attendance/open", { cache: "no-store" }),
      ]);
      const schedJson = await schedRes.json();
      const memberJson = await memberRes.json().catch(() => ({}));
      const openJson = await openRes.json().catch(() => ({}));

      const data = schedJson.data ?? [];
      setEvents(
        data.map(
          (s: {
            id: string;
            title?: string;
            type?: string;
            startTime?: string;
            endTime?: string;
            coach?: { user?: { name?: string } };
          }) => {
            const start = s.startTime ? new Date(s.startTime) : new Date();
            const rawEnd = s.endTime ? new Date(s.endTime) : new Date();
            let end = rawEnd;
            if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + 60 * 60 * 1000);
            const startDayEnd = new Date(start); startDayEnd.setHours(23, 59, 59, 999);
            if (end > startDayEnd) end = startDayEnd;
            const coachName = s.coach?.user?.name ?? "—";
            const timeRange = `${format(start, "h:mm a")} – ${format(rawEnd, "h:mm a")}`;
            const baseTitle = s.title ?? "Session";
            return {
              id: s.id,
              title: `${baseTitle} • ${timeRange} • ${coachName}`,
              baseTitle,
              coachName,
              start,
              end,
              type: s.type,
            };
          },
        ),
      );
      setHasCoach(Boolean(memberJson.hasCoach));
      setOpenAttendances(openJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const fetchAttendanceStatus = React.useCallback(async (scheduleId: string, eventStart: Date) => {
    const dateStr = format(eventStart, "yyyy-MM-dd");
    try {
      const res = await fetch(
        `/api/client/attendance/status?scheduleId=${encodeURIComponent(scheduleId)}&date=${encodeURIComponent(dateStr)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      const status = (json.status as AttendanceStatus) ?? "none";
      setAttendanceStatus(status);
      if (status === "completed" && !completedToastShown.current) {
        completedToastShown.current = true;
        toast.info("Already attended this session.");
      }
      if (status !== "completed") completedToastShown.current = false;
    } catch {
      setAttendanceStatus("none");
    }
  }, []);

  const handleSelectEvent = (event: ScheduleEvent) => {
    if (hasCoach) {
      toast.info("Premium: Your coach will check you in/out via QR at the gym.");
      return;
    }
    setSelectedEvent(event);
    setAttendanceStatus(null);
    setModalOpen(true);
    void fetchAttendanceStatus(event.id, event.start);
  };

  const openForSchedule = selectedEvent
    ? openAttendances.find((a) => a.scheduleId === selectedEvent.id)
    : null;
  const now = new Date();
  const sessionEnded = selectedEvent ? selectedEvent.end < now : false;

  const handleCheckIn = async () => {
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/client/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: selectedEvent.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Check-in failed");
        if (json.error?.includes("Already attended")) setAttendanceStatus("completed");
        return;
      }
      toast.success("Checked in.");
      await loadData();
      setModalOpen(false);
      setSelectedEvent(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!openForSchedule) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/client/attendance/${openForSchedule.id}/check-out`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Check-out failed");
        return;
      }
      toast.success("Checked out.");
      await loadData();
      setModalOpen(false);
      setSelectedEvent(null);
      setAttendanceStatus(null);
    } finally {
      setActionLoading(false);
    }
  };

  const runningTime =
    openForSchedule && openForSchedule.checkInTime
      ? formatDistanceToNow(new Date(openForSchedule.checkInTime), { addSuffix: false })
      : null;

  return (
    <RequireMembership>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold">My Schedules</h1>
        <p className="text-sm text-muted-foreground">
          {hasCoach
            ? "Sessions available for your plan. Your coach will check you in/out via QR at the gym."
            : "Click a session to check in or check out. Date and time are shown in the modal."}
        </p>
      </div>

      <Card className="p-3">
        <div style={{ height: 640 }}>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading calendar…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No schedules available for your membership in this period. Ask admin to add sessions for your plan.
            </p>
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
              dayPropGetter={dayPropGetter}
              onSelectEvent={(event) => handleSelectEvent(event as ScheduleEvent)}
              components={{ event: (props) => <ScheduleEventComponent event={props.event as ScheduleEvent} /> }}
              style={{ height: "100%" }}
            />
          )}
        </div>
      </Card>

      {modalOpen && selectedEvent && !hasCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-2 text-sm font-semibold">{selectedEvent.title}</h2>
            <dl className="space-y-1 text-xs text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">Date</dt>
                <dd>{format(selectedEvent.start, "PPP")}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Time</dt>
                <dd>
                  {format(selectedEvent.start, "p")} – {format(selectedEvent.end, "p")}
                </dd>
              </div>
              {openForSchedule && (
                <>
                  <div>
                    <dt className="font-medium text-foreground">Checked in at</dt>
                    <dd>{format(new Date(openForSchedule.checkInTime), "p")}</dd>
                  </div>
                  {runningTime && (
                    <div>
                      <dt className="font-medium text-foreground">Running time</dt>
                      <dd>{runningTime}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              {attendanceStatus === "completed" && (
                <p className="text-xs text-muted-foreground">Already attended this session.</p>
              )}
              {sessionEnded && !openForSchedule && attendanceStatus !== "completed" && (
                <p className="text-xs text-muted-foreground">This session has ended.</p>
              )}
              {!sessionEnded && !openForSchedule && attendanceStatus !== "completed" && (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={actionLoading}
                  onClick={handleCheckIn}
                >
                  {actionLoading ? "Checking in…" : "Check in"}
                </Button>
              )}
              {openForSchedule && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={actionLoading}
                  onClick={handleCheckOut}
                >
                  {actionLoading ? "Checking out…" : "Check out"}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setModalOpen(false);
                  setSelectedEvent(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </RequireMembership>
  );
}
