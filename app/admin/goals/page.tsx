"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type GoalRow = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
};

export default function AdminGoalsPage() {
  const [rows, setRows] = React.useState<GoalRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<GoalRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    name: "",
    description: "",
    category: "GENERAL_FITNESS",
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
        const res = await fetch(`/api/admin/goals?${params.toString()}`, {
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
    setEditingGoal(null);
    setFormValues({
      name: "",
      description: "",
      category: "GENERAL_FITNESS",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: GoalRow) => {
    setEditingGoal(row);
    setFormValues({
      name: row.name,
      description: row.description ?? "",
      category: row.category,
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
      const payload = {
        name: formValues.name,
        description: formValues.description || undefined,
        category: formValues.category,
      };

      if (editingGoal) {
        await fetch(`/api/admin/goals/${editingGoal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/admin/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setDialogOpen(false);
      await fetchData({ page: 1, search });
      toast.success(editingGoal ? "Goal updated" : "Goal created");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<GoalRow>[] = [
    { key: "name", header: "Name" },
    { key: "description", header: "Description" },
    {
      key: "category",
      header: "Category",
      render: (row) =>
        row.category
          .split("_")
          .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
          .join(" "),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Workout Goals</h1>
          <p className="text-sm text-muted-foreground">
            Manage types of workout goals available to clients.
          </p>
        </div>
        <Button
          size="xs"
          className="h-7 px-2 text-[11px]"
          onClick={openNewDialog}
        >
          New Goal
        </Button>
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

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">
              {editingGoal ? "Edit Goal" : "New Goal"}
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
                <label className="font-medium" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formValues.description}
                  onChange={handleFormChange}
                  className="h-16 w-full rounded-md border bg-background px-2 py-1 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="category">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formValues.category}
                  onChange={handleFormChange}
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                >
                  <option value="WEIGHT_LOSS">Weight loss</option>
                  <option value="MUSCLE_GAIN">Muscle gain</option>
                  <option value="ENDURANCE">Endurance</option>
                  <option value="FLEXIBILITY">Flexibility</option>
                  <option value="GENERAL_FITNESS">General fitness</option>
                </select>
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

