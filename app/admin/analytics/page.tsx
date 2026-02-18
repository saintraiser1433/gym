"use client";

import * as React from "react";
import { ChartCard } from "@/components/chart-card";

type OverviewResponse = {
  totalMembers: number;
  activeMemberships: number;
  todaysAttendance: number;
  revenueThisMonth: number;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = React.useState<OverviewResponse | null>(null);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/analytics/overview");
      if (res.ok) {
        setData(await res.json());
      }
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
        <ChartCard title="Attendance trend">
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Connect to time-series attendance data here.
          </div>
        </ChartCard>
        <ChartCard title="Revenue trend">
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Connect to revenue timeseries here.
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

