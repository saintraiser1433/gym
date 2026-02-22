"use client";

import * as React from "react";
import { format } from "date-fns";

export type ReceiptPayment = {
  id: string;
  amount: number;
  type: string;
  status: string;
  method: string | null;
  referenceId: string | null;
  date: string;
  clientName: string;
  clientEmail: string;
};

const GYM_NAME = "CrosCal Fitness";

function formatType(t: string) {
  return t ? t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ") : "—";
}

function parseReference(ref: string | null): { reference?: string; proofUrl?: string } {
  if (!ref) return {};
  try {
    const parsed = JSON.parse(ref);
    if (parsed && typeof parsed === "object") {
      return {
        reference: parsed.reference ?? undefined,
        proofUrl: parsed.proofUrl ?? undefined,
      };
    }
  } catch {
    const [, rest] = ref.split(":");
    if (rest) return { reference: rest };
  }
  return {};
}

export function PaymentReceipt({ payment }: { payment: ReceiptPayment }) {
  const ref = parseReference(payment.referenceId);
  const dateFormatted = format(new Date(payment.date), "PPP 'at' h:mm a");

  return (
    <div
      className="payment-receipt-print-area max-w-md border border-border bg-card p-6 text-foreground"
      data-receipt
    >
      <div className="space-y-4">
        <div className="border-b border-border pb-3 text-center">
          <h2 className="text-lg font-semibold">{GYM_NAME}</h2>
          <p className="text-xs text-muted-foreground">Payment Receipt</p>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Date</dt>
            <dd>{dateFormatted}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Receipt No.</dt>
            <dd className="font-mono text-xs">{payment.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Client</dt>
            <dd>{payment.clientName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate text-xs">{payment.clientEmail}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{formatType(payment.type)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Method</dt>
            <dd>{payment.method ? payment.method.toUpperCase() : "—"}</dd>
          </div>
          {ref.reference && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-mono text-xs">{ref.reference}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{payment.status}</dd>
          </div>
          <div className="border-t border-border pt-3">
            <div className="flex justify-between gap-4 text-base font-semibold">
              <dt>Amount</dt>
              <dd>₱{payment.amount.toLocaleString()}</dd>
            </div>
          </div>
        </dl>
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Thank you for your payment.
        </p>
      </div>
    </div>
  );
}

/** Call this to print the receipt (opens print dialog). */
export function printReceipt(payment: ReceiptPayment) {
  const ref = parseReference(payment.referenceId);
  const dateFormatted = format(new Date(payment.date), "PPP 'at' h:mm a");
  const refRow = ref.reference
    ? `<tr><td style="color:#6b7280">Reference</td><td class="mono">${ref.reference}</td></tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${payment.id}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 14px; padding: 24px; color: #111; max-width: 400px; margin: 0 auto; }
    h2 { margin: 0; font-size: 18px; }
    .sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td { padding: 6px 0; vertical-align: top; }
    td:first-child { color: #6b7280; width: 100px; }
    .amount { font-size: 16px; font-weight: 600; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 8px; }
    .mono { font-family: monospace; font-size: 12px; }
    .thanks { text-align: center; font-size: 12px; color: #6b7280; margin-top: 16px; }
  </style>
</head>
<body>
  <div style="text-align:center; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
    <h2>${GYM_NAME}</h2>
    <p class="sub">Payment Receipt</p>
  </div>
  <table>
    <tr><td style="color:#6b7280">Date</td><td>${dateFormatted}</td></tr>
    <tr><td style="color:#6b7280">Receipt No.</td><td class="mono">${payment.id}</td></tr>
    <tr><td style="color:#6b7280">Client</td><td>${payment.clientName}</td></tr>
    <tr><td style="color:#6b7280">Email</td><td class="mono">${payment.clientEmail}</td></tr>
    <tr><td style="color:#6b7280">Type</td><td>${formatType(payment.type)}</td></tr>
    <tr><td style="color:#6b7280">Method</td><td>${payment.method ? payment.method.toUpperCase() : "—"}</td></tr>
    ${refRow}
    <tr><td style="color:#6b7280">Status</td><td>${payment.status}</td></tr>
    <tr><td style="color:#6b7280">Amount</td><td class="amount">₱${payment.amount.toLocaleString()}</td></tr>
  </table>
  <p class="thanks">Thank you for your payment.</p>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
}
