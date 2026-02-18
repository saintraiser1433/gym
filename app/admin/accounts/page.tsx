"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Ban, CheckCircle2, Trash2 } from "lucide-react";
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

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

export default function AdminAccountsPage() {
  const [rows, setRows] = React.useState<AdminUserRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUserRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    name: "",
    email: "",
    role: "ADMIN",
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
        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        setRows(
          (json.data ?? []).map((u: any) => ({
            ...u,
            createdAt: new Date(u.createdAt).toLocaleDateString(),
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

  const openNewUserDialog = () => {
    setEditingUser(null);
    setFormValues({
      name: "",
      email: "",
      role: "ADMIN",
      status: "ACTIVE",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (row: AdminUserRow) => {
    setEditingUser(row);
    setFormValues({
      name: row.name,
      email: row.email,
      role: row.role,
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
      const payload = {
        name: formValues.name,
        email: formValues.email,
        password: "password123", // default password for new users
        role: formValues.role,
        status: formValues.status,
      };

      if (editingUser) {
        await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            role: payload.role,
            status: payload.status,
          }),
        });
      } else {
        await fetch(`/api/admin/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setDialogOpen(false);
      await fetchData({ page: 1, search });
      toast.success(editingUser ? "User updated" : "User created");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AdminUserRow>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Joined" },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="outline"
            className="h-7 w-7 p-0"
            aria-label={`Edit ${row.email}`}
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
                aria-label={`Deactivate ${row.email}`}
              >
                {row.status === "ACTIVE" ? (
                  <Ban className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  {row.status === "ACTIVE"
                    ? "Set user to inactive?"
                    : "Set user to active?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {row.status === "ACTIVE"
                    ? "This will prevent the user from signing in until reactivated."
                    : "This will allow the user to sign in again."}
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
                      await fetch(`/api/admin/users/${row.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          status:
                            row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                        }),
                      });
                      await fetchData({ page, search });
                      toast.success(
                        row.status === "ACTIVE"
                          ? "User set to inactive"
                          : "User set to active",
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="xs"
                variant="outline"
                className="h-7 w-7 p-0"
                aria-label={`Delete ${row.email}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Delete user?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The user account will be
                  permanently removed.
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
                      await fetch(`/api/admin/users/${row.id}`, {
                        method: "DELETE",
                      });
                      await fetchData({ page, search });
                      toast.success("User deleted");
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
          <h1 className="text-lg font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage admin, coach, and client accounts.
          </p>
        </div>
        <Button
          size="xs"
          className="h-7 px-2 text-[11px]"
          onClick={openNewUserDialog}
        >
          New User
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
              {editingUser ? "Edit User" : "New User"}
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
                <label className="font-medium" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onChange={handleFormChange}
                  className="h-7 text-[11px]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formValues.role}
                    onChange={handleFormChange}
                    className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="COACH">Coach</option>
                    <option value="CLIENT">Client</option>
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

