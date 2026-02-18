"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table";

type PaymentRow = {
  id: string;
  amount: number;
  type: string;
  status: string;
  date: string;
};

export default function AdminPaymentsPage() {
  const [rows, setRows] = React.useState<PaymentRow[]>([]);
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
        const res = await fetch(`/api/admin/payments?${params.toString()}`);
        const json = await res.json();
        setRows(
          (json.data ?? []).map((p: any) => ({
            ...p,
            date: new Date(p.date).toLocaleDateString(),
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

  const columns: Column<PaymentRow>[] = [
    {
      key: "date",
      header: "Date",
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => `₱${row.amount.toLocaleString()}`,
    },
    { key: "type", header: "Type" },
    { key: "status", header: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Review membership and renewal payments.
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

