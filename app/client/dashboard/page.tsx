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

type CoachPlan = {
  nutritionObjective: string | null;
  dailyCalorieTarget: number | null;
  dailyProteinGrams: number | null;
  dailyCarbsGrams: number | null;
  dailyFatGrams: number | null;
  recommendedGymSessionsPerWeek: number | null;
  workoutScheduleNotes: string | null;
  coachName: string | null;
};

function formatNutritionObjective(key: string | null) {
  if (!key) return "—";
  const labels: Record<string, string> = {
    WEIGHT_LOSS: "Weight loss",
    SLIMMING: "Slimming / toning",
    MUSCLE_GAIN: "Muscle gain",
    GENERAL_FITNESS: "General fitness",
    MAINTENANCE: "Maintenance",
    OTHER: "Other",
  };
  return labels[key] ?? key.replace(/_/g, " ").toLowerCase();
}

export default function ClientDashboardPage() {
  const [membership, setMembership] = React.useState<CurrentMembership | null>(null);
  const [analytics, setAnalytics] = React.useState<AnalyticsResponse | null>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [hasCoach, setHasCoach] = React.useState<boolean | null>(null);
  const [goals, setGoals] = React.useState<ClientGoalItem[] | null>(null);
  const [coachPlan, setCoachPlan] = React.useState<CoachPlan | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [membershipRes, analyticsRes, qrRes, memberRes, goalsRes, profileRes] = await Promise.all([
        fetch("/api/client/memberships/current"),
        fetch("/api/client/analytics"),
        fetch("/api/client/attendance/qr"),
        fetch("/api/client/me/membership", { cache: "no-store" }).catch(() => null),
        fetch("/api/client/goals", { cache: "no-store" }).catch(() => null),
        fetch("/api/client/profile", { cache: "no-store" }).catch(() => null),
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
      if (profileRes?.ok) {
        const profileJson = await profileRes.json();
        const d = profileJson?.data;
        if (d) {
          setCoachPlan({
            nutritionObjective: d.nutritionObjective ?? null,
            dailyCalorieTarget: d.dailyCalorieTarget ?? null,
            dailyProteinGrams: d.dailyProteinGrams ?? null,
            dailyCarbsGrams: d.dailyCarbsGrams ?? null,
            dailyFatGrams: d.dailyFatGrams ?? null,
            recommendedGymSessionsPerWeek: d.recommendedGymSessionsPerWeek ?? null,
            workoutScheduleNotes: d.workoutScheduleNotes ?? null,
            coachName: d.coachName ?? null,
          });
        } else {
          setCoachPlan(null);
        }
      } else {
        setCoachPlan(null);
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

      {hasCoach === true &&
        coachPlan &&
        (coachPlan.nutritionObjective ||
          coachPlan.dailyCalorieTarget != null ||
          coachPlan.dailyProteinGrams != null ||
          coachPlan.dailyCarbsGrams != null ||
          coachPlan.dailyFatGrams != null ||
          coachPlan.recommendedGymSessionsPerWeek != null ||
          (coachPlan.workoutScheduleNotes && coachPlan.workoutScheduleNotes.trim())) && (
          <div className="rounded-md border bg-card p-4">
            <p className="text-xs text-muted-foreground">From your coach</p>
            <h2 className="text-sm font-semibold">Your coach&apos;s plan</h2>
            <div className="mt-1 text-xs text-muted-foreground">
              Coach: <span className="text-foreground">{coachPlan.coachName ?? "—"}</span>
            </div>
            {(coachPlan.nutritionObjective ||
              coachPlan.dailyCalorieTarget != null ||
              coachPlan.dailyProteinGrams != null ||
              coachPlan.dailyCarbsGrams != null ||
              coachPlan.dailyFatGrams != null) && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nutrition</h3>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Objective</dt>
                    <dd>{formatNutritionObjective(coachPlan.nutritionObjective)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Daily calories</dt>
                    <dd>
                      {coachPlan.dailyCalorieTarget != null
                        ? `${Math.round(coachPlan.dailyCalorieTarget)} kcal`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Daily protein</dt>
                    <dd>
                      {coachPlan.dailyProteinGrams != null
                        ? `${Math.round(coachPlan.dailyProteinGrams)} g`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Daily carbs</dt>
                    <dd>
                      {coachPlan.dailyCarbsGrams != null
                        ? `${Math.round(coachPlan.dailyCarbsGrams)} g`
                        : "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Daily fat</dt>
                    <dd>
                      {coachPlan.dailyFatGrams != null
                        ? `${Math.round(coachPlan.dailyFatGrams)} g`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            {(coachPlan.recommendedGymSessionsPerWeek != null ||
              (coachPlan.workoutScheduleNotes && coachPlan.workoutScheduleNotes.trim())) && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Gym schedule
                </h3>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Sessions per week</dt>
                    <dd>
                      {coachPlan.recommendedGymSessionsPerWeek != null
                        ? `${coachPlan.recommendedGymSessionsPerWeek}× at the gym`
                        : "—"}
                    </dd>
                  </div>
                  {coachPlan.workoutScheduleNotes && coachPlan.workoutScheduleNotes.trim() && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Schedule notes</dt>
                      <dd className="whitespace-pre-wrap">{coachPlan.workoutScheduleNotes.trim()}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}

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

