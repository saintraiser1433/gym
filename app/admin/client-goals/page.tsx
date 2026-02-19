"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";

type ClientGoalRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  goalName: string;
  goalCategory: string;
  targetValue: number | null;
  currentValue: number | null;
  deadline: string | null;
  deadlineRaw: string | null;
  status: string;
};

export default function AdminClientGoalsPage() {
  const [rows, setRows] = React.useState<ClientGoalRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);

  const fetchData = React.useCallback(
    async (opts?: { page?: number; search?: string }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(opts?.page ?? page));
        params.set("pageSize", String(pageSize));
        if (opts?.search ?? search) {
          params.set("search", (opts?.search ?? search) as string);
        }
        const res = await fetch(`/api/admin/client-goals?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const data = json.data ?? [];
        setRows(
          data.map((r: any) => ({
            id: r.id,
            clientName: r.client?.user?.name ?? "—",
            clientEmail: r.client?.user?.email ?? "—",
            goalName: r.goal?.name ?? "—",
            goalCategory: r.goal?.category ?? "—",
            targetValue: r.targetValue ?? null,
            currentValue: r.currentValue ?? null,
            deadline: r.deadline ? new Date(r.deadline).toLocaleDateString() : null,
            deadlineRaw: r.deadline ? new Date(r.deadline).toISOString().slice(0, 10) : null,
            status: r.status ?? "ACTIVE",
          })),
        );
        setTotal(json.total ?? 0);
        if (opts?.page) setPage(opts.page);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search],
  );

  React.useEffect(() => {
    void fetchData();
  }, []);

  const formatCategory = (c: string) =>
    c
      .split("_")
      .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
      .join(" ");

  const columns: Column<ClientGoalRow>[] = [
    { key: "clientName", header: "Client" },
    { key: "clientEmail", header: "Email" },
    { key: "goalName", header: "Goal" },
    {
      key: "goalCategory",
      header: "Category",
      render: (row) => formatCategory(row.goalCategory),
    },
    {
      key: "targetValue",
      header: "Target",
      render: (row) => (row.targetValue != null ? String(row.targetValue) : "—"),
    },
    {
      key: "currentValue",
      header: "Current",
      render: (row) => (row.currentValue != null ? String(row.currentValue) : "—"),
    },
    {
      key: "deadline",
      header: "Deadline",
      render: (row) => row.deadline ?? "—",
    },
    { key: "status", header: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Client Goals</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of which workout goals are assigned to which clients.
        </p>
      </div>

      <Card className="p-3">
        <DataTable
          columns={columns}
          data={rows}
          page={page}
          pageSize={pageSize}
          total={total}
          isLoading={loading}
          onPageChange={(newPage) => void fetchData({ page: newPage })}
          onSearchChange={(value) => {
            setSearch(value || undefined);
            void fetchData({ page: 1, search: value });
          }}
        />
      </Card>

    </div>
  );
}
