"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PremiumClient = {
  id: string;
  name: string;
  email: string;
  assignedCoachId: string | null;
  assignedCoachName: string | null;
  assignedCoachEmail: string | null;
};

type CoachOption = { id: string; name: string; email: string };

export default function AdminCoachAssignmentsPage() {
  const [clients, setClients] = React.useState<PremiumClient[]>([]);
  const [coaches, setCoaches] = React.useState<CoachOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = React.useState<Record<string, string>>({});

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, coachesRes] = await Promise.all([
        fetch("/api/admin/premium-clients", { cache: "no-store" }),
        fetch("/api/admin/coaches", { cache: "no-store" }),
      ]);
      const clientsJson = await clientsRes.json();
      const coachesJson = await coachesRes.json();
      const data = clientsJson.data ?? [];
      setClients(data);
      setCoaches(coachesJson.data ?? []);
      const initial: Record<string, string> = {};
      data.forEach((c: PremiumClient) => {
        initial[c.id] = c.assignedCoachId ?? "";
      });
      setSelectedCoach(initial);
    } catch {
      setClients([]);
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async (clientId: string) => {
    const coachId = selectedCoach[clientId] === "" ? null : selectedCoach[clientId];
    setSavingId(clientId);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedCoachId: coachId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update");
      }
      toast.success("Coach assignment updated");
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingId(null);
    }
  };

  const columns: Column<PremiumClient>[] = [
    { key: "name", header: "Client" },
    { key: "email", header: "Email" },
    {
      key: "assignedCoachName",
      header: "Current coach",
      render: (row) => row.assignedCoachName ?? "—",
    },
    {
      key: "id",
      header: "Assign coach",
      render: (row) => (
        <div className="flex items-center gap-2">
          <select
            className="h-8 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
            value={selectedCoach[row.id] ?? ""}
            onChange={(e) =>
              setSelectedCoach((prev) => ({ ...prev, [row.id]: e.target.value }))
            }
          >
            <option value="">Unassigned</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={savingId === row.id}
            onClick={() => handleSave(row.id)}
          >
            {savingId === row.id ? "Saving…" : "Save"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Coach assignments</h1>
        <p className="text-muted-foreground text-sm">
          Assign premium clients to a coach. Only clients with an active Premium (or coach-included) membership are listed.
        </p>
      </div>
      <Card className="p-4">
        <DataTable
          columns={columns}
          data={clients}
          page={1}
          pageSize={clients.length || 10}
          total={clients.length}
          isLoading={loading}
          emptyMessage="No premium clients found."
        />
      </Card>
    </div>
  );
}
