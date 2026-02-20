"use client";

import * as React from "react";
import { format, getDay, startOfWeek } from "date-fns";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card } from "@/components/ui/card";

type ScheduleEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type?: string;
};

const locales = { "en-US": undefined };
const localizer = dateFnsLocalizer({
  format,
  getDay,
  startOfWeek,
  locales,
});

export default function ClientSchedulesPage() {
  const [events, setEvents] = React.useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/client/schedules", { cache: "no-store" });
        const json = await res.json();
        const data = json.data ?? [];
        if (cancelled) return;
        setEvents(
          data.map(
            (s: {
              id: string;
              title?: string;
              type?: string;
              startTime?: string;
              endTime?: string;
            }) => ({
              id: s.id,
              title: s.title ?? "Session",
              start: s.startTime ? new Date(s.startTime) : new Date(),
              end: s.endTime ? new Date(s.endTime) : new Date(),
              type: s.type,
            }),
          ),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">My Schedules</h1>
        <p className="text-sm text-muted-foreground">
          Sessions and classes you are signed up for or have attended.
        </p>
      </div>

      <Card className="p-3">
        <div className="h-[600px]">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading calendar…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No schedules yet. Your sessions will appear here once you have attendance records.
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
              className="rbc-calendar rounded-md border border-border bg-card text-foreground"
            />
          )}
        </div>
      </Card>
    </div>
  );
}
