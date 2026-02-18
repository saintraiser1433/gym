"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";

type AttendanceRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  scheduleTitle: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  method: string;
};

export default function AdminAttendancePage() {
  const [rows, setRows] = React.useState<AttendanceRow[]>([]);
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

        const res = await fetch(`/api/admin/attendance?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();

        setRows(
          (json.data ?? []).map((r: any) => ({
            id: r.id,
            clientName: r.client?.user?.name ?? "Unknown",
            clientEmail: r.client?.user?.email ?? "",
            scheduleTitle: r.schedule?.title ?? null,
            checkInTime: new Date(r.checkInTime).toLocaleString(),
            checkOutTime: r.checkOutTime
              ? new Date(r.checkOutTime).toLocaleString()
              : null,
            method: r.method ?? "QR",
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

  const columns: Column<AttendanceRow>[] = [
    { key: "clientName", header: "Client" },
    { key: "clientEmail", header: "Email" },
    {
      key: "scheduleTitle",
      header: "Schedule",
      render: (row) => row.scheduleTitle ?? "—",
    },
    { key: "checkInTime", header: "Check-in" },
    {
      key: "checkOutTime",
      header: "Check-out",
      render: (row) => row.checkOutTime ?? "—",
    },
    { key: "method", header: "Method" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          View all client check-ins and check-outs.
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

