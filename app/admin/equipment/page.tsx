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
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEquipment, setEditingEquipment] = React.useState<EquipmentRow | null>(
    null,
  );
  const [formValues, setFormValues] = React.useState({
    name: "",
    type: "",
    status: "AVAILABLE",
    quantity: "1",
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
        const res = await fetch(`/api/admin/equipment?${params.toString()}`, {
          cache: "no-store",
        });
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

  const openNewDialog = () => {
    setEditingEquipment(null);
    setFormValues({
      name: "",
      type: "",
      status: "AVAILABLE",
      quantity: "1",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: EquipmentRow) => {
    setEditingEquipment(row);
    setFormValues({
      name: row.name,
      type: row.type ?? "",
      status: row.status,
      quantity: String(row.quantity),
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
      const payload = {
        name: formValues.name,
        type: formValues.type || null,
        status: formValues.status,
        quantity: parseInt(formValues.quantity, 10) || 1,
      };

      if (editingEquipment) {
        await fetch(`/api/admin/equipment/${editingEquipment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Equipment updated");
      } else {
        await fetch("/api/admin/equipment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Equipment created");
      }
      setDialogOpen(false);
      await fetchData({ page: 1, search });
    } catch {
      toast.error("Failed to save equipment");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<EquipmentRow>[] = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type" },
    { key: "status", header: "Status" },
    { key: "quantity", header: "Qty" },
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
                  Delete equipment?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove &quot;{row.name}&quot; from your equipment
                  list. This action cannot be undone.
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
                      await fetch(`/api/admin/equipment/${row.id}`, {
                        method: "DELETE",
                      });
                      await fetchData({ page, search });
                      toast.success("Equipment deleted");
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
          <h1 className="text-lg font-semibold">Equipment</h1>
          <p className="text-sm text-muted-foreground">
            Track gym equipment, status, and quantities.
          </p>
        </div>
        <Button
          size="xs"
          className="h-7 px-2 text-[11px]"
          onClick={openNewDialog}
        >
          New Equipment
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
          onPageChange={(newPage) => {
            void fetchData({ page: newPage });
          }}
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
              {editingEquipment ? "Edit Equipment" : "New Equipment"}
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
              <div className="space-y-1">
                <label className="font-medium" htmlFor="type">
                  Type
                </label>
                <Input
                  id="type"
                  name="type"
                  value={formValues.type}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  placeholder="e.g. Treadmill, Bench"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                    <option value="AVAILABLE">Available</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="BROKEN">Broken</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="quantity">
                    Quantity
                  </label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    value={formValues.quantity}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
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

