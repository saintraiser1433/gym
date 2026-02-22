"use client";

import * as React from "react";
import { format, getDay, startOfDay, startOfWeek } from "date-fns";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRScanner } from "@/components/qr-scanner";
import { toast } from "sonner";

type ScheduleEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type?: string;
  capacity?: number | null;
  recurrence?: string | null;
};

type AttendanceStatus = "none" | "checked_in" | "completed";

const formatEventTitle = (
  title: string,
  start: Date,
  end: Date,
  coachLabel: string,
) => `${title} • ${format(start, "h:mm a")} – ${format(end, "h:mm a")} • ${coachLabel}`;

const locales = { "en-US": undefined };
const localizer = dateFnsLocalizer({
  format,
  getDay,
  startOfWeek,
  locales,
});

export default function CoachSchedulesPage() {
  const [events, setEvents] = React.useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEvent, setSelectedEvent] = React.useState<ScheduleEvent | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [scannedClientId, setScannedClientId] = React.useState<string | null>(null);
  const [scannedClientName, setScannedClientName] = React.useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = React.useState<AttendanceStatus | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const dayPropGetter = (date: Date) =>
    date < startOfDay(new Date()) ? { className: "rbc-past-day" } : {};

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/schedules", { cache: "no-store" });
      const json = await res.json();
      const data = json.data ?? [];
      setEvents(
        data.map(
          (s: {
            id: string;
            title?: string;
            type?: string;
            startTime?: string;
            endTime?: string;
            capacity?: number | null;
            recurrence?: string | null;
          }) => {
            const start = s.startTime ? new Date(s.startTime) : new Date();
            const rawEnd = s.endTime ? new Date(s.endTime) : new Date();
            let end = rawEnd;
            if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + 60 * 60 * 1000);
            const startDayEnd = new Date(start); startDayEnd.setHours(23, 59, 59, 999);
            if (end > startDayEnd) end = startDayEnd;
            const baseTitle = s.title ?? "Session";
            return {
              id: s.id,
              title: formatEventTitle(baseTitle, start, rawEnd, "Me"),
              start,
              end,
              type: s.type,
              capacity: s.capacity,
              recurrence: s.recurrence,
            };
          },
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSelectEvent = React.useCallback((event: ScheduleEvent) => {
    const now = new Date();
    if (event.end <= now) {
      toast.error("Cannot open past sessions. Select a current or future session.");
      return;
    }
    setSelectedEvent(event);
    setScannedClientId(null);
    setScannedClientName(null);
    setAttendanceStatus(null);
    setModalOpen(true);
  }, []);

  const fetchAttendanceStatus = React.useCallback(async () => {
    if (!scannedClientId || !selectedEvent) {
      setAttendanceStatus(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/coach/attendance/status?clientId=${encodeURIComponent(scannedClientId)}&scheduleId=${encodeURIComponent(selectedEvent.id)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      setAttendanceStatus((json.status as AttendanceStatus) ?? "none");
    } catch {
      setAttendanceStatus("none");
    }
  }, [scannedClientId, selectedEvent]);

  React.useEffect(() => {
    void fetchAttendanceStatus();
  }, [fetchAttendanceStatus]);

  const handleScan = React.useCallback((decodedText: string) => {
    try {
      const payload = JSON.parse(decodedText) as { clientId?: string };
      const id = typeof payload.clientId === "string" ? payload.clientId.trim() : null;
      if (id) {
        setScannedClientId(id);
        setScannedClientName(null);
        fetch("/api/coach/clients")
          .then((r) => r.json())
          .then((j) => {
            const client = (j.data ?? []).find((c: { id: string; user?: { name?: string } }) => c.id === id);
            if (client?.user?.name) setScannedClientName(client.user.name);
          })
          .catch(() => undefined);
      }
    } catch {
      toast.error("Invalid QR code");
    }
  }, []);

  const handleCheckIn = async () => {
    if (!scannedClientId || !selectedEvent) {
      toast.error("Scan the client QR code first.");
      return;
    }
    if (attendanceStatus === "checked_in") {
      toast.error("Client is already checked in to this session.");
      return;
    }
    if (attendanceStatus === "completed") {
      toast.error("Already attended this session.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/coach/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: scannedClientId, scheduleId: selectedEvent.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Check-in failed");
        return;
      }
      const name = json.client?.user?.name ?? scannedClientName ?? "Client";
      toast.success(`Checked in: ${name}`);
      setScannedClientId(null);
      setScannedClientName(null);
      void fetchAttendanceStatus();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!scannedClientId || !selectedEvent) {
      toast.error("Scan the client QR code first.");
      return;
    }
    if (attendanceStatus !== "checked_in") {
      toast.error("No active check-in found. Check in the client first.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/coach/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: scannedClientId, scheduleId: selectedEvent.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Check-out failed");
        return;
      }
      const name = json.client?.user?.name ?? scannedClientName ?? "Client";
      toast.success(`Checked out: ${name}`);
      setScannedClientId(null);
      setScannedClientName(null);
      setAttendanceStatus(null);
    } finally {
      setActionLoading(false);
    }
  };

  const showCheckIn =
    attendanceStatus === "none" || (attendanceStatus === null && scannedClientId && selectedEvent);
  const showCheckOut = attendanceStatus === "checked_in";
  const showAlreadyAttended = attendanceStatus === "completed";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Schedules</h1>
        <p className="text-sm text-muted-foreground">
          Your sessions, classes, and gym hours. Click a current or future session to check in/out clients via QR.
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
              dayPropGetter={dayPropGetter}
              onSelectEvent={(event) => handleSelectEvent(event as ScheduleEvent)}
              style={{ height: "100%" }}
            />
          )}
        </div>
      </Card>

      {modalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-auto rounded-lg bg-background p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {selectedEvent.title.split(" • ")[0]} — {format(selectedEvent.start, "h:mm a")} – {format(selectedEvent.end, "h:mm a")}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setModalOpen(false);
                  setSelectedEvent(null);
                  setScannedClientId(null);
                  setScannedClientName(null);
                  setAttendanceStatus(null);
                }}
              >
                Close
              </Button>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Scan client QR code</h3>
              <QRScanner onResult={handleScan} delayMs={400} />
            </div>

            {scannedClientId && (
              <p className="text-sm text-muted-foreground">
                Scanned: <span className="font-medium text-foreground">{scannedClientName ?? scannedClientId}</span>
              </p>
            )}

            {showAlreadyAttended && (
              <p className="text-sm text-amber-600 dark:text-amber-400">Already attended this session.</p>
            )}

            <div className="flex flex-wrap gap-2">
              {showCheckIn && (
                <Button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={!scannedClientId || actionLoading}
                >
                  Check in
                </Button>
              )}
              {showCheckOut && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCheckOut}
                  disabled={!scannedClientId || actionLoading}
                >
                  Check out
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
