"use client";

import * as React from "react";

type ClientSummary = {
  id: string;
};

export default function CoachDashboardPage() {
  const [clients, setClients] = React.useState<ClientSummary[]>([]);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch("/api/coach/clients");
      if (res.ok) {
        const json = await res.json();
        setClients(json.data ?? []);
      }
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
          <p className="mt-1 text-2xl font-semibold">—</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending reviews</p>
          <p className="mt-1 text-2xl font-semibold">—</p>
        </div>
      </div>
    </div>
  );
}

