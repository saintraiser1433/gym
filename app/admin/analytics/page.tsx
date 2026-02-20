"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartCard } from "@/components/chart-card";

type OverviewResponse = {
  totalMembers: number;
  activeMemberships: number;
  todaysAttendance: number;
  revenueThisMonth: number;
};

type ChartsResponse = {
  attendanceByDay: { date: string; count: number }[];
  revenueByMonth: { month: string; total: number }[];
};

export default function AdminAnalyticsPage() {
  const [data, setData] = React.useState<OverviewResponse | null>(null);
  const [charts, setCharts] = React.useState<ChartsResponse | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [overviewRes, chartsRes] = await Promise.all([
        fetch("/api/admin/analytics/overview"),
        fetch("/api/admin/analytics/charts"),
      ]);
      if (overviewRes.ok) setData(await overviewRes.json());
      if (chartsRes.ok) setCharts(await chartsRes.json());
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Key metrics for CrosCal Fitness.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Members</p>
          <p className="mt-1 text-2xl font-semibold">
            {data?.totalMembers ?? "—"}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active Memberships</p>
          <p className="mt-1 text-2xl font-semibold">
            {data?.activeMemberships ?? "—"}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Today&apos;s Attendance</p>
          <p className="mt-1 text-2xl font-semibold">
            {data?.todaysAttendance ?? "—"}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Revenue This Month</p>
          <p className="mt-1 text-2xl font-semibold">
            ₱{data?.revenueThisMonth?.toLocaleString() ?? "—"}
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Attendance trend" description="Last 14 days">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts?.attendanceByDay ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(value: number) => [value, "Check-ins"]} labelFormatter={(v) => `Date: ${v}`} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue trend" description="Last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts?.revenueByMonth ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(value: number) => [`₱${value.toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

