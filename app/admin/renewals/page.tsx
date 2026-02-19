"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";

type RenewalRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  membershipName: string;
  renewalDate: string;
  newEndDate: string;
  amount: number;
};

export default function AdminRenewalsPage() {
  const [rows, setRows] = React.useState<RenewalRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const fetchData = React.useCallback(
    async (opts?: { page?: number }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(opts?.page ?? page));
        params.set("pageSize", String(pageSize));
        const res = await fetch(`/api/admin/renewals?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const data = json.data ?? [];
        setRows(
          data.map((r: any) => ({
            id: r.id,
            clientName: r.clientMembership?.client?.user?.name ?? "—",
            clientEmail: r.clientMembership?.client?.user?.email ?? "—",
            membershipName: r.clientMembership?.membership?.name ?? "—",
            renewalDate: new Date(r.renewalDate).toLocaleDateString(),
            newEndDate: new Date(r.newEndDate).toLocaleDateString(),
            amount: r.amount,
          })),
        );
        setTotal(json.total ?? 0);
        if (opts?.page) setPage(opts.page);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  React.useEffect(() => {
    void fetchData();
  }, []);

  const columns: Column<RenewalRow>[] = [
    { key: "renewalDate", header: "Date" },
    { key: "clientName", header: "Client" },
    { key: "clientEmail", header: "Email" },
    { key: "membershipName", header: "Membership" },
    { key: "newEndDate", header: "New end date" },
    {
      key: "amount",
      header: "Amount",
      render: (row) => `₱${row.amount.toLocaleString()}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Renewals</h1>
        <p className="text-sm text-muted-foreground">
          Read-only log of membership renewals (approved payments).
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
        />
      </Card>
    </div>
  );
}

