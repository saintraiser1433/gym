"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table";

type EquipmentRow = {
  id: string;
  name: string;
  type?: string | null;
  status: string;
  quantity: number;
};

export default function AdminEquipmentPage() {
  const [rows, setRows] = React.useState<EquipmentRow[]>([]);
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
        const res = await fetch(`/api/admin/equipment?${params.toString()}`);
        const json = await res.json();
        setRows(json.data ?? []);
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

  const columns: Column<EquipmentRow>[] = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type" },
    { key: "status", header: "Status" },
    { key: "quantity", header: "Qty" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Equipment</h1>
        <p className="text-sm text-muted-foreground">
          Track gym equipment and maintenance.
        </p>
      </div>
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
    </div>
  );
}

