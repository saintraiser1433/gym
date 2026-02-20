"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";

type ClientRow = {
  id: string;
  name: string;
  email: string;
  joinDate: string;
};

export default function CoachClientsPage() {
  const [rows, setRows] = React.useState<ClientRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coach/clients", { cache: "no-store" });
      const json = await res.json();
      const data = json.data ?? [];
      setRows(
        data.map((c: { id: string; user?: { name?: string; email?: string }; joinDate?: string }) => ({
          id: c.id,
          name: c.user?.name ?? "—",
          email: c.user?.email ?? "—",
          joinDate: c.joinDate ? new Date(c.joinDate).toLocaleDateString() : "—",
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const columns: Column<ClientRow>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "joinDate", header: "Join date" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">My Clients</h1>
        <p className="text-sm text-muted-foreground">
          Clients assigned to you. View their details and progress.
        </p>
      </div>

      <Card className="p-3">
        <DataTable
          columns={columns}
          data={rows}
          page={1}
          pageSize={rows.length || 10}
          total={rows.length}
          isLoading={loading}
          onPageChange={() => {}}
          onSearchChange={() => {}}
          emptyMessage="No clients assigned yet."
        />
      </Card>
    </div>
  );
}
