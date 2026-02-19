"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type ClientMembershipItem = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  membership: {
    id: string;
    name: string;
    type: string;
    duration: number;
    price: number;
    coachPrice?: number | null;
  };
};

type AvailablePlan = {
  id: string;
  name: string;
  type: string;
  duration: number;
  price: number;
  coachPrice?: number | null;
};

type PendingApplication = {
  id: string;
  amount: number;
  method: string | null;
  createdAt: string;
  reference: string | null;
  membership: {
    id: string;
    name: string;
    type: string;
    duration: number;
    price: number;
    coachPrice?: number | null;
  } | null;
};

export default function ClientMembershipsPage() {
  const [list, setList] = React.useState<ClientMembershipItem[]>([]);
  const [available, setAvailable] = React.useState<AvailablePlan[]>([]);
  const [pending, setPending] = React.useState<PendingApplication | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [applyModalOpen, setApplyModalOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<AvailablePlan | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "GCASH">("CASH");
  const [reference, setReference] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [coachOption, setCoachOption] = React.useState<"NO_COACH" | "WITH_COACH">(
    "NO_COACH",
  );

  const loadData = React.useCallback(async () => {
    try {
      const [myRes, availRes, pendingRes] = await Promise.all([
        fetch("/api/client/memberships", { cache: "no-store" }),
        fetch("/api/client/memberships/available", { cache: "no-store" }),
        fetch("/api/client/memberships/pending", { cache: "no-store" }),
      ]);
      const myJson = await myRes.json();
      const availJson = await availRes.json();
      const pendingJson = await pendingRes.json();
      if (Array.isArray(myJson.data)) {
        setList(
          myJson.data.map((r: any) => ({
            id: r.id,
            startDate: new Date(r.startDate).toLocaleDateString(),
            endDate: new Date(r.endDate).toLocaleDateString(),
            status: r.status ?? "ACTIVE",
            membership: r.membership
              ? {
                  id: r.membership.id,
                  name: r.membership.name,
                  type: r.membership.type,
                  duration: r.membership.duration,
                  price: r.membership.price,
                  coachPrice:
                    r.membership.features && typeof r.membership.features === "object"
                      ? (r.membership.features.coachPrice as
                          | number
                          | null
                          | undefined) ?? null
                      : null,
                }
              : ({} as ClientMembershipItem["membership"]),
          })),
        );
      }
      if (Array.isArray(availJson.data)) {
        setAvailable(
          availJson.data.map((m: any) => ({
            id: m.id,
            name: m.name,
            type: m.type,
            duration: m.duration,
            price: m.price,
            coachPrice:
              m.features && typeof m.features === "object"
                ? (m.features.coachPrice as number | null | undefined) ?? null
                : null,
          })),
        );
      }
      setPending(
        pendingJson?.data
          ? {
              id: pendingJson.data.id,
              amount: pendingJson.data.amount,
              method: pendingJson.data.method ?? null,
              createdAt: new Date(pendingJson.data.createdAt).toLocaleString(),
              reference: pendingJson.data.reference ?? null,
              membership: pendingJson.data.membership ?? null,
            }
          : null,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const openApplyModal = (plan: AvailablePlan) => {
    // If there is an active membership, treat this as an upgrade from that one
    if (activeMembership) {
      (window as any).__upgradeFromClientMembershipId = activeMembership.id;
    } else {
      (window as any).__upgradeFromClientMembershipId = undefined;
    }
    setSelectedPlan(plan);
    setPaymentMethod("CASH");
    setReference("");
    setCoachOption("NO_COACH");
    setApplyModalOpen(true);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (pending) {
      toast.error("You already have a pending membership application.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("method", paymentMethod);
      if (paymentMethod === "GCASH" && reference) {
        formData.append("reference", reference);
      }
      formData.append("variant", coachOption);
      const fileInput = document.getElementById(
        "gcashRefImage",
      ) as HTMLInputElement | null;
      if (paymentMethod === "GCASH" && fileInput?.files?.[0]) {
        formData.append("proof", fileInput.files[0]);
      }
      const renewId = (window as any).__renewClientMembershipId as
        | string
        | undefined;
      const upgradeFromId = (window as any)
        .__upgradeFromClientMembershipId as string | undefined;
      let url = "/api/client/memberships/apply";
      if (renewId) {
        formData.append("clientMembershipId", renewId);
        // For renewals, backend already knows price from existing membership
        formData.append("membershipId", selectedPlan.id);
        url = "/api/client/memberships/renew";
      } else {
        formData.append("membershipId", selectedPlan.id);
        if (upgradeFromId) {
          formData.append("upgradeFromClientMembershipId", upgradeFromId);
        }
      }

      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to apply");
        return;
      }
      setApplyModalOpen(false);
      setSelectedPlan(null);
      (window as any).__renewClientMembershipId = undefined;
      (window as any).__upgradeFromClientMembershipId = undefined;
      await loadData();
      toast.success(
        renewId
          ? "Renewal submitted. Admin will approve your payment (Cash/GCash)."
          : "Application submitted. Admin will approve your payment (Cash/GCash).",
      );
    } catch {
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const formatType = (t: string) =>
    t ? t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ") : "";

  const hasPending = !!pending;
  const activeMembership = list.find((m) => m.status === "ACTIVE") ?? null;
  const hasActive = !!activeMembership;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Memberships</h1>
        <p className="text-sm text-muted-foreground">
          Your plans and apply for a new membership. Payment is approved by admin
          (Cash or GCash).
        </p>
      </div>

      {/* My memberships */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">My Memberships</h2>
        {hasPending && pending && (
          <Card className="border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  Pending approval
                </p>
                <p className="mt-1 text-sm font-medium">
                  {pending.membership?.name ?? "Membership application"}
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  {pending.method ? pending.method.toUpperCase() : "Payment"} · ₱
                  {pending.amount.toLocaleString()} — waiting for admin approval.
                </p>
                {pending.reference && (
                  <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-200">
                    GCash ref: {pending.reference}
                  </p>
                )}
              </div>
              <Button
                size="xs"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/client/memberships/pending", {
                      method: "DELETE",
                    });
                    if (!res.ok) {
                      const j = await res.json();
                      toast.error(j.error ?? "Failed to cancel application");
                      return;
                    }
                    await loadData();
                    toast.success("Pending application cancelled.");
                  } catch {
                    toast.error("Failed to cancel application");
                  }
                }}
              >
                Cancel application
              </Button>
            </div>
          </Card>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              You don’t have any membership yet. Apply for a plan below.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item) => {
              const isExpired = item.status === "EXPIRED";
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.membership.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatType(item.membership.type)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <dt>Start</dt>
                    <dd>{item.startDate}</dd>
                    <dt>End</dt>
                    <dd>{item.endDate}</dd>
                    <dt>Duration</dt>
                    <dd>{item.membership.duration} days</dd>
                    <dt>Price</dt>
                  <dd>₱{item.membership.price?.toLocaleString() ?? "—"}</dd>
                  </dl>
                  {isExpired && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={hasPending}
                        onClick={() => {
                          setSelectedPlan(item.membership);
                          setPaymentMethod("CASH");
                          setReference("");
                          setCoachOption("NO_COACH");
                          setApplyModalOpen(true);
                          // store the clientMembershipId on the window for renew handler
                          (window as any).__renewClientMembershipId = item.id;
                        }}
                      >
                        Renew
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Available plans – Apply */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Apply for a membership</h2>
        {loading ? null : available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No plans available at the moment.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((plan) => {
              const isCurrent =
                !!activeMembership && activeMembership.membership.id === plan.id;
              const isUpgradeMode = hasActive;
              const disabled =
                hasPending || (isUpgradeMode && isCurrent); // disable Upgrade on current plan

              return (
                <Card key={plan.id} className="p-4">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatType(plan.type)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Price (no coach): ₱{plan.price?.toLocaleString() ?? "—"}
                  </p>
                  {plan.coachPrice != null && (
                    <p className="text-xs text-muted-foreground">
                      Price (with coach): ₱{plan.coachPrice.toLocaleString()}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Duration: {plan.duration} days
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 h-8 text-xs"
                    disabled={disabled}
                    onClick={() => openApplyModal(plan)}
                  >
                    {isUpgradeMode ? "Upgrade" : "Apply"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply modal */}
      {applyModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">
              {typeof (window as any).__renewClientMembershipId === "string"
                ? "Renew membership"
                : "Apply for membership"}
            </h2>
            <p className="mb-2 text-xs text-muted-foreground">
              {selectedPlan.name} — ₱{selectedPlan.price?.toLocaleString()}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Current price: ₱
              {(
                coachOption === "WITH_COACH" && selectedPlan.coachPrice != null
                  ? selectedPlan.coachPrice
                  : selectedPlan.price
              )?.toLocaleString()}
            </p>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Your application will be sent to admin. Pay via your chosen method;
              admin will approve after payment.
            </p>
            <form onSubmit={handleApply} className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="font-medium">Coach option</label>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="coachOption"
                      value="NO_COACH"
                      checked={coachOption === "NO_COACH"}
                      onChange={() => setCoachOption("NO_COACH")}
                      className="h-3 w-3"
                    />
                    <span>
                      No coach — ₱{selectedPlan.price.toLocaleString()}
                    </span>
                  </label>
                  {selectedPlan.coachPrice != null && (
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="coachOption"
                        value="WITH_COACH"
                        checked={coachOption === "WITH_COACH"}
                        onChange={() => setCoachOption("WITH_COACH")}
                        className="h-3 w-3"
                      />
                      <span>
                        With coach — ₱{selectedPlan.coachPrice.toLocaleString()}
                      </span>
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium">Payment method</label>
                <select
                  className="h-8 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as "CASH" | "GCASH")
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="GCASH">GCash</option>
                </select>
              </div>
              {paymentMethod === "GCASH" && (
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="gcashRef">
                    GCash reference number
                  </label>
                  <Input
                    id="gcashRef"
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="h-8 text-[11px]"
                    required
                  />
                  <label className="mt-1 block text-[11px]" htmlFor="gcashRefImage">
                    Upload payment screenshot
                  </label>
                  <input
                    id="gcashRefImage"
                    type="file"
                    accept="image/*"
                    className="h-8 w-full text-[11px]"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    setApplyModalOpen(false);
                    setSelectedPlan(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Submit application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
