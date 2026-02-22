"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentReceipt, printReceipt, type ReceiptPayment } from "@/components/payment-receipt";
import { toast } from "sonner";

type ClientPayment = {
  id: string;
  amount: number;
  type: string;
  status: string;
  method: string | null;
  date: string;
};

export default function ClientPaymentsPage() {
  const [rows, setRows] = React.useState<ClientPayment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [receiptData, setReceiptData] = React.useState<ReceiptPayment | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = React.useState<string | null>(null);

  const openReceipt = React.useCallback(async (id: string) => {
    setReceiptLoadingId(id);
    try {
      const res = await fetch(`/api/client/payments/${id}`, { cache: "no-store" });
      if (!res.ok) {
        toast.error("Could not load receipt");
        return;
      }
      const data = await res.json();
      setReceiptData({
        id: data.id,
        amount: data.amount,
        type: data.type,
        status: data.status,
        method: data.method,
        referenceId: data.referenceId,
        date: data.date,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
      });
    } catch {
      toast.error("Could not load receipt");
    } finally {
      setReceiptLoadingId(null);
    }
  }, []);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/client/payments", { cache: "no-store" });
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        setRows(
          data.map((p: any) => ({
            id: p.id as string,
            amount: p.amount as number,
            type: p.type as string,
            status: p.status as string,
            method: (p.method as string | null) ?? null,
            date: new Date(p.date).toLocaleString(),
          })),
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const formatStatus = (s: string) =>
    s ? s.charAt(0) + s.slice(1).toLowerCase() : "";

  const formatType = (t: string) =>
    t ? t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ") : "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          View your membership payments. This page is read-only.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          You don&apos;t have any payments yet.
        </Card>
      ) : (
        <>
        <div className="space-y-2">
          {rows.map((p) => (
            <Card key={p.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-xs">
                <div className="text-[11px] text-muted-foreground">{p.date}</div>
                <div className="text-sm font-medium">
                  ₱{p.amount.toLocaleString()} · {formatType(p.type)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Method: {p.method ? p.method.toUpperCase() : "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    p.status === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : p.status === "PENDING"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "bg-red-500/20 text-red-700 dark:text-red-400"
                  }`}
                >
                  {formatStatus(p.status)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={receiptLoadingId === p.id}
                  onClick={() => openReceipt(p.id)}
                >
                  {receiptLoadingId === p.id ? "…" : "Receipt"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {receiptData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[90vh] flex-col gap-3 rounded-lg bg-background p-4 shadow-lg">
              <PaymentReceipt payment={receiptData} />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printReceipt(receiptData)}
                >
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setReceiptData(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

