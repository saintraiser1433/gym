"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartCard } from "@/components/chart-card";
import { WorkoutPlayer } from "@/components/workout-player";
import { QRDisplay } from "@/components/qr-display";

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

type QrResponse = { image: string };

type ClientGoalItem = { id: string; status: string };

export default function ClientDashboardPage() {
  const [membership, setMembership] = React.useState<CurrentMembership | null>(null);
  const [analytics, setAnalytics] = React.useState<AnalyticsResponse | null>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [hasCoach, setHasCoach] = React.useState<boolean | null>(null);
  const [goals, setGoals] = React.useState<ClientGoalItem[] | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [membershipRes, analyticsRes, qrRes, memberRes, goalsRes] = await Promise.all([
        fetch("/api/client/memberships/current"),
        fetch("/api/client/analytics"),
        fetch("/api/client/attendance/qr"),
        fetch("/api/client/me/membership", { cache: "no-store" }).catch(() => null),
        fetch("/api/client/goals", { cache: "no-store" }).catch(() => null),
      ]);
      if (membershipRes.ok) {
        const json = await membershipRes.json();
        setMembership(json.data);
      }
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (qrRes.ok) {
        const qrJson: QrResponse = await qrRes.json();
        setQr(qrJson.image);
      }
      if (memberRes?.ok) {
        const memberJson = await memberRes.json();
        setHasCoach(Boolean(memberJson.hasCoach));
      } else {
        setHasCoach(false);
      }
      if (goalsRes?.ok) {
        const goalsJson = await goalsRes.json();
        const data = Array.isArray(goalsJson?.data) ? goalsJson.data : [];
        setGoals(data.map((g: any) => ({ id: g.id, status: g.status ?? "ACTIVE" })));
      } else {
        setGoals([]);
      }
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
          <p className="mt-1 text-2xl font-semibold">
            {goals == null
              ? "—"
              : (() => {
                  const completed = goals.filter((g) => g.status === "COMPLETED").length;
                  const total = goals.length;
                  return total === 0 ? "0 goals" : `${completed} / ${total} goals`;
                })()}
          </p>
          {goals != null && goals.length > 0 && (
            <Link href="/client/goals" className="text-xs text-primary underline mt-1 inline-block">
              View goals
            </Link>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="My attendance" description="Last 4 weeks">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.attendanceByWeek ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(value: number | undefined) => [value ?? 0, "Check-ins"]} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Today&apos;s workout</h2>
          <WorkoutPlayer steps={[]} />
        </div>
      </div>
      <div className="rounded-md border bg-card p-4">
        <h2 className="text-sm font-semibold mb-2">My QR code</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {hasCoach === true
            ? "Premium: Your coach will scan this QR at the gym to check you in or out. Show this code when you arrive."
            : hasCoach === false
              ? "Show this QR at the gym, or use Schedules to check in to a specific session (click a session → Check in)."
              : "Loading…"}
        </p>
        <QRDisplay src={qr} />
      </div>
    </div>
  );
}

