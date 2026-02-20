"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "@/components/chart-card";
import { WorkoutPlayer } from "@/components/workout-player";

type CurrentMembership = {
  membership: {
    name: string;
    type: string;
  };
};

type AnalyticsResponse = {
  attendanceByWeek: { weekStart: string; count: number }[];
  attendanceThisMonth: number;
};

export default function ClientDashboardPage() {
  const [membership, setMembership] = React.useState<CurrentMembership | null>(null);
  const [analytics, setAnalytics] = React.useState<AnalyticsResponse | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [membershipRes, analyticsRes] = await Promise.all([
        fetch("/api/client/memberships/current"),
        fetch("/api/client/analytics"),
      ]);
      if (membershipRes.ok) {
        const json = await membershipRes.json();
        setMembership(json.data);
      }
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Current membership</p>
          <p className="mt-1 text-lg font-semibold">
            {membership?.membership.name ?? "None"}
          </p>
          <p className="text-xs text-muted-foreground">
            {membership?.membership.type ?? ""}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Check-ins this month</p>
          <p className="mt-1 text-2xl font-semibold">
            {analytics?.attendanceThisMonth ?? "—"}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Goal progress</p>
          <p className="mt-1 text-2xl font-semibold">—</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="My attendance" description="Last 4 weeks">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.attendanceByWeek ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(value: number) => [value, "Check-ins"]} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Today&apos;s workout</h2>
          <WorkoutPlayer steps={[]} />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Quick links</h2>
        <ul className="text-sm text-muted-foreground">
          <li>View workouts</li>
          <li>Check-in with QR</li>
          <li>View payments</li>
        </ul>
      </div>
    </div>
  );
}

