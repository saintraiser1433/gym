"use client";

import * as React from "react";
import { RequireMembership } from "@/components/require-membership";
import { Card } from "@/components/ui/card";

function formatHrsMins(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

type AttendanceRow = {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  method: string;
  scheduleTitle: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  lateMinutes: number;
  undertimeMinutes: number | null;
};

export default function ClientAttendancePage() {
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/client/attendance", { cache: "no-store" });
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        setRows(
          data.map((a: any) => ({
            id: a.id as string,
            date: new Date(a.checkInTime).toLocaleDateString(),
            checkIn: new Date(a.checkInTime).toLocaleTimeString(),
            checkOut: a.checkOutTime
              ? new Date(a.checkOutTime).toLocaleTimeString()
              : null,
            method: a.method as string,
            scheduleTitle: a.schedule ? (a.schedule.title as string) : null,
            scheduleStart: a.scheduleStart
              ? new Date(a.scheduleStart).toLocaleTimeString()
              : null,
            scheduleEnd: a.scheduleEnd
              ? new Date(a.scheduleEnd).toLocaleTimeString()
              : null,
            lateMinutes: a.lateMinutes ?? 0,
            undertimeMinutes: a.undertimeMinutes ?? null,
          })),
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const formatMethod = (m: string) =>
    m ? m.charAt(0) + m.slice(1).toLowerCase().replace("_", " ") : "";

  return (
    <RequireMembership>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            View your past check-ins and attendance history.
          </p>
        </div>

        {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          No attendance records yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="space-y-1.5 text-xs">
                <div className="text-[11px] text-muted-foreground">{r.date}</div>
                <div className="text-sm font-medium">
                  {r.scheduleTitle ?? "Gym visit"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Schedule: {r.scheduleStart ?? "—"} – {r.scheduleEnd ?? "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Check-in {r.checkIn} – Check-out {r.checkOut ?? "—"} · {formatMethod(r.method)}
                </div>
                {(r.lateMinutes > 0 || (r.undertimeMinutes != null && r.undertimeMinutes > 0)) && (
                  <div className="text-[11px] text-muted-foreground">
                    {r.lateMinutes > 0 && (
                      <span>Late {formatHrsMins(r.lateMinutes)}</span>
                    )}
                    {r.lateMinutes > 0 && r.undertimeMinutes != null && r.undertimeMinutes > 0 && " · "}
                    {r.undertimeMinutes != null && r.undertimeMinutes > 0 && (
                      <span>Undertime {formatHrsMins(r.undertimeMinutes)}</span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>
    </RequireMembership>
  );
}

