"use client";

import * as React from "react";
import { WorkoutPlayer } from "@/components/workout-player";

type CurrentMembership = {
  membership: {
    name: string;
    type: string;
  };
};

export default function ClientDashboardPage() {
  const [membership, setMembership] = React.useState<CurrentMembership | null>(null);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/client/memberships/current");
      if (res.ok) {
        const json = await res.json();
        setMembership(json.data);
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
          <p className="text-xs text-muted-foreground">Attendance streak</p>
          <p className="mt-1 text-2xl font-semibold">—</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Goal progress</p>
          <p className="mt-1 text-2xl font-semibold">—</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Today&apos;s workout</h2>
          <WorkoutPlayer steps={[]} />
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
    </div>
  );
}

