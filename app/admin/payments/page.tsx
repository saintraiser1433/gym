"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type PaymentRow = {
  id: string;
  clientName: string;
  amount: number;
  type: string;
  status: string;
  method: string | null;
  date: string;
  reference?: string | null;
  proofUrl?: string | null;
};

export default function AdminPaymentsPage() {
  const [rows, setRows] = React.useState<PaymentRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<
    "ALL" | "PENDING" | "COMPLETED" | "FAILED"
  >("ALL");

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
        const res = await fetch(`/api/admin/payments?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        setRows(
          (json.data ?? []).map((p: any) => {
            let proofUrl: string | null = null;
            let reference: string | null = null;
            const refRaw = p.referenceId as string | null;
            if (refRaw) {
              try {
                const parsed = JSON.parse(refRaw);
                if (parsed && typeof parsed === "object") {
                  proofUrl = (parsed.proofUrl as string | null) ?? null;
                  reference = (parsed.reference as string | null) ?? null;
                }
              } catch {
                // legacy format: membershipId or membershipId:ref
                const [, legacyRef] = refRaw.split(":");
                if (legacyRef) {
                  reference = legacyRef;
                }
              }
            }
            return {
              id: p.id,
              clientName: p.client?.user?.name ?? "—",
              amount: p.amount,
              type: p.type,
              status: p.status,
              method: p.method ?? null,
              date: new Date(p.date).toLocaleDateString(),
              reference,
              proofUrl,
            } satisfies PaymentRow;
          }),
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

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json();
        toast.error(j.error ?? "Failed to approve");
        return;
      }
      await fetchData({ page, search });
      toast.success("Payment approved. The membership will appear in Client Memberships.");
    } catch {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/admin/payments/${id}/reject`, { method: "POST" });
      await fetchData({ page, search });
      toast.success("Payment rejected.");
    } catch {
      toast.error("Failed to reject");
    }
  };

  const columns: Column<PaymentRow>[] = [
    { key: "date", header: "Date" },
    { key: "clientName", header: "Client" },
    {
      key: "amount",
      header: "Amount",
      render: (row) => `₱${row.amount.toLocaleString()}`,
    },
    { key: "type", header: "Type" },
    { key: "status", header: "Status" },
    {
      key: "method",
      header: "Method",
      render: (row) => (row.method ? String(row.method).toUpperCase() : "—"),
    },
    {
      key: "reference",
      header: "Ref No.",
      render: (row) =>
        row.method === "GCASH" && row.reference ? row.reference : "—",
    },
    {
      key: "proofUrl",
      header: "Proof",
      render: (row) =>
        row.method === "GCASH" && row.proofUrl ? (
          <a
            href={row.proofUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-blue-600 hover:underline"
          >
            View
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "id",
      header: "Actions",
      render: (row) =>
        row.status === "PENDING" &&
        (row.type === "MEMBERSHIP" || row.type === "RENEWAL") ? (
          <div className="flex items-center gap-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                >
                  Approve
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm">
                    Approve payment?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will approve the{" "}
                    {row.type === "RENEWAL" ? "renewal" : "membership"} payment
                    for {row.clientName} (₱{row.amount.toLocaleString()},{" "}
                    {row.method ?? "—"}).{" "}
                    {row.type === "RENEWAL"
                      ? "The existing membership dates will be extended."
                      : "The client will be assigned the membership and it will appear in Client Memberships."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-7 px-2 text-[11px]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="h-7 px-3 text-[11px]"
                    onClick={() => handleApprove(row.id)}
                  >
                    Approve
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                >
                  Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm">
                    Reject payment?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reject the{" "}
                    {row.type === "RENEWAL" ? "renewal request" : "membership application"}{" "}
                    for {row.clientName}. The payment will be marked as rejected
                    and the client will not receive the{" "}
                    {row.type === "RENEWAL" ? "renewal" : "membership"}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-7 px-2 text-[11px]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="h-7 px-3 text-[11px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => handleReject(row.id)}
                  >
                    Reject
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          "—"
        ),
    },
  ];

  const filteredRows =
    statusFilter === "ALL"
      ? rows
      : rows.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">Payments</h1>
            <p className="text-sm text-muted-foreground">
              Review payments. Approve or reject pending membership applications
              (Cash/GCash). Approved applications appear in Client Memberships.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${
              statusFilter === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setStatusFilter("ALL")}
          >
            All
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${
              statusFilter === "PENDING"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setStatusFilter("PENDING")}
          >
            Pending
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${
              statusFilter === "COMPLETED"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setStatusFilter("COMPLETED")}
          >
            Completed
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${
              statusFilter === "FAILED"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setStatusFilter("FAILED")}
          >
            Rejected
          </button>
        </div>
      </div>
      <Card className="p-3">
        <DataTable
          columns={columns}
          data={filteredRows}
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
