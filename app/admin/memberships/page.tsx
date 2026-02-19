"use client";

import * as React from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
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

type MembershipRow = {
  id: string;
  name: string;
  type: string;
  duration: number;
  price: number;
  status: string;
  coachPrice?: number | null;
};

export default function AdminMembershipsPage() {
  const [rows, setRows] = React.useState<MembershipRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingMembership, setEditingMembership] = React.useState<MembershipRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    name: "",
    type: "BASIC",
    duration: "",
    price: "",
    coachPrice: "",
    status: "ACTIVE",
  });
  const [saving, setSaving] = React.useState(false);

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
        const res = await fetch(`/api/admin/memberships?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const data = (json.data ?? []) as any[];
        setRows(
          data.map((m) => ({
            id: m.id as string,
            name: m.name as string,
            type: m.type as string,
            duration: m.duration as number,
            price: m.price as number,
            status: m.status as string,
            coachPrice:
              m.features && typeof m.features === "object"
                ? (m.features.coachPrice as number | null | undefined) ?? null
                : null,
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

  const openNewDialog = () => {
    setEditingMembership(null);
    setFormValues({
      name: "",
      type: "BASIC",
      duration: "",
      price: "",
      coachPrice: "",
      status: "ACTIVE",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: MembershipRow) => {
    setEditingMembership(row);
    setFormValues({
      name: row.name,
      type: row.type,
      duration: String(row.duration),
      price: String(row.price),
      coachPrice: row.coachPrice != null ? String(row.coachPrice) : "",
      status: row.status,
    });
    setDialogOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const coachPriceNumber =
        formValues.coachPrice && formValues.coachPrice.trim().length > 0
          ? parseFloat(formValues.coachPrice)
          : undefined;

      const payload: any = {
        name: formValues.name,
        type: formValues.type,
        duration: parseInt(formValues.duration, 10),
        price: parseFloat(formValues.price),
        status: formValues.status,
      };

      if (coachPriceNumber != null && !Number.isNaN(coachPriceNumber)) {
        payload.features = { coachPrice: coachPriceNumber };
      }

      if (editingMembership) {
        await fetch(`/api/admin/memberships/${editingMembership.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Membership updated");
      } else {
        await fetch("/api/admin/memberships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Membership created");
      }
      setDialogOpen(false);
      await fetchData({ page: 1, search });
    } catch {
      toast.error("Failed to save membership");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<MembershipRow>[] = [
    { key: "name", header: "Name" },
    {
      key: "type",
      header: "Type",
      render: (row) =>
        row.type.charAt(0) + row.type.slice(1).toLowerCase(),
    },
    { key: "duration", header: "Duration (days)" },
    {
      key: "price",
      header: "Price (no coach)",
      render: (row) => `₱${row.price.toLocaleString()}`,
    },
    {
      key: "coachPrice",
      header: "Price (with coach)",
      render: (row) =>
        row.coachPrice != null ? `₱${row.coachPrice.toLocaleString()}` : "—",
    },
    { key: "status", header: "Status" },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            className="h-7 w-7 p-0"
            aria-label={`Edit ${row.name}`}
            onClick={() => openEditDialog(row)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="xs"
                variant="outline"
                className="h-7 w-7 p-0"
                aria-label={`Delete ${row.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Delete membership?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &quot;{row.name}&quot;. Existing client
                  memberships may be affected. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-7 px-2 text-[11px]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="h-7 px-3 text-[11px]"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch(
                        `/api/admin/memberships/${row.id}`,
                        {
                          method: "DELETE",
                        },
                      );
                      if (!res.ok) {
                        const json = await res.json();
                        toast.error(
                          json?.error ??
                            "Failed to delete membership. It might be in use.",
                        );
                      } else {
                        await fetchData({ page, search });
                        toast.success("Membership deleted");
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Memberships</h1>
          <p className="text-sm text-muted-foreground">
            Configure membership plans and pricing.
          </p>
        </div>
        <Button
          size="xs"
          className="h-7 px-2 text-[11px]"
          onClick={openNewDialog}
        >
          New Membership
        </Button>
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

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">
              {editingMembership ? "Edit Membership" : "New Membership"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="font-medium" htmlFor="name">
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formValues.name}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="type">
                    Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formValues.type}
                    onChange={handleFormChange}
                    className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  >
                    <option value="BASIC">Basic</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formValues.status}
                    onChange={handleFormChange}
                    className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="duration">
                    Duration (days)
                  </label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min={1}
                    value={formValues.duration}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="price">
                    Price without coach (₱)
                  </label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={formValues.price}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="coachPrice">
                  Price with coach (₱)
                </label>
                <Input
                  id="coachPrice"
                  name="coachPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formValues.coachPrice}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  placeholder="e.g. 7500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="xs"
                  className="h-7 px-3 text-[11px]"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
