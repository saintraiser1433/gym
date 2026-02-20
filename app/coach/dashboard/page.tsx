"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "@/components/chart-card";

type ClientSummary = {
  id: string;
};

type AnalyticsResponse = {
  sessionsByWeek: { weekStart: string; count: number }[];
  attendanceByWeek: { weekStart: string; count: number }[];
  todaysSessions: number;
};

export default function CoachDashboardPage() {
  const [clients, setClients] = React.useState<ClientSummary[]>([]);
  const [analytics, setAnalytics] = React.useState<AnalyticsResponse | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [clientsRes, analyticsRes] = await Promise.all([
        fetch("/api/coach/clients"),
        fetch("/api/coach/analytics"),
      ]);
      if (clientsRes.ok) {
        const json = await clientsRes.json();
        setClients(json.data ?? []);
      }
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Assigned clients</p>
          <p className="mt-1 text-2xl font-semibold">{clients.length}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Today&apos;s sessions</p>
          <p className="mt-1 text-2xl font-semibold">
            {analytics?.todaysSessions ?? "—"}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending reviews</p>
          <p className="mt-1 text-2xl font-semibold">—</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Sessions" description="Last 4 weeks">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.sessionsByWeek ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(value: number) => [value, "Sessions"]} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Session attendance" description="Client check-ins last 4 weeks">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.attendanceByWeek ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(value: number) => [value, "Check-ins"]} />
              <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

