"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export default function ClientNotificationsPage() {
  const [rows, setRows] = React.useState<NotificationRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/client/notifications", {
          cache: "no-store",
        });
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        setRows(
          data.map((n: any) => ({
            id: n.id as string,
            title: n.title as string,
            message: n.message as string,
            createdAt: new Date(n.createdAt).toLocaleString(),
            read: Boolean(n.read),
          })),
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Workout reminders, updates, and other messages from the gym.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          You have no notifications.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card
              key={n.id}
              className={`p-3 text-xs ${
                n.read ? "opacity-70" : "border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{n.title}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {n.message}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {n.createdAt}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

