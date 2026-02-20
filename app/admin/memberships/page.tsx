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
  description?: string | null;
  price: number;
  status: string;
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
    description: "",
    price: "",
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
            description: (m.description as string | null | undefined) ?? null,
            price: m.price as number,
            status: m.status as string,
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
      description: "",
      price: "",
      status: "ACTIVE",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: MembershipRow) => {
    setEditingMembership(row);
    setFormValues({
      name: row.name,
      type: row.type,
      description: row.description ?? "",
      price: String(row.price),
      status: row.status,
    });
    setDialogOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: formValues.name.trim(),
        type: formValues.type,
        price: parseFloat(formValues.price),
        status: formValues.status,
      };
      if (formValues.description.trim()) {
        payload.description = formValues.description.trim();
      }

      const url = editingMembership
        ? `/api/admin/memberships/${editingMembership.id}`
        : "/api/admin/memberships";
      const res = await fetch(url, {
        method: editingMembership ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error((json as { error?: string }).error ?? "Failed to save membership");
        return;
      }
      toast.success(editingMembership ? "Membership updated" : "Membership created");
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
    {
      key: "description",
      header: "Description",
      render: (row) => (row.description ? String(row.description).slice(0, 40) + (row.description.length > 40 ? "…" : "") : "—"),
    },
    {
      key: "price",
      header: "Price",
      render: (row) => `₱${row.price.toLocaleString()}`,
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
                    <option value="BASIC">Basic (no coach)</option>
                    <option value="PREMIUM">Premium (has coach)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Basic is automatic; Premium includes a coach.
                  </p>
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
              <div className="space-y-1">
                <label className="font-medium" htmlFor="description">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formValues.description}
                  onChange={handleFormChange}
                  className="h-16 w-full rounded-md border bg-background px-2 py-1 text-[11px]"
                  placeholder="Details about this membership"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="price">
                  Price (₱)
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
