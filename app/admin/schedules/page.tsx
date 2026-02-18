"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";

type ScheduleRow = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  coachName: string;
  capacity: number | null;
};

export default function AdminSchedulesPage() {
  const [rows, setRows] = React.useState<ScheduleRow[]>([]);
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

        const res = await fetch(`/api/admin/schedules?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();

        setRows(
          (json.data ?? []).map((s: any) => ({
            id: s.id,
            title: s.title,
            startTime: new Date(s.startTime).toLocaleString(),
            endTime: new Date(s.endTime).toLocaleString(),
            coachName: s.coach?.user?.name ?? "Unassigned",
            capacity: s.capacity ?? null,
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

  const columns: Column<ScheduleRow>[] = [
    { key: "title", header: "Title" },
    { key: "coachName", header: "Coach" },
    { key: "startTime", header: "Start Time" },
    { key: "endTime", header: "End Time" },
    {
      key: "capacity",
      header: "Capacity",
      render: (row) => (row.capacity ?? "—"),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Schedules</h1>
        <p className="text-sm text-muted-foreground">
          View and manage workout class schedules.
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
          onPageChange={(newPage) => {
            void fetchData({ page: newPage });
          }}
          onSearchChange={(value) => {
            setSearch(value || undefined);
            void fetchData({ page: 1, search: value });
          }}
        />
      </Card>
    </div>
  );
}

