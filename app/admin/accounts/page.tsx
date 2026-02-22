"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Ban, CheckCircle2, Trash2, Eye, EyeOff } from "lucide-react";
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
    password: "",
    confirmPassword: "",
    role: "ADMIN",
    status: "ACTIVE",
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  type TabValue = "pending" | "active" | "rejected";
  const [tab, setTab] = React.useState<TabValue>("active");

  const statusForTab: Record<TabValue, string> = {
    pending: "INACTIVE",
    active: "ACTIVE",
    rejected: "REJECTED",
  };

  const fetchData = React.useCallback(
    async (opts?: { page?: number; search?: string; tab?: TabValue }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(opts?.page ?? page));
        params.set("pageSize", String(pageSize));
        params.set("status", statusForTab[opts?.tab ?? tab]);
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
        if (opts?.page != null) setPage(opts.page);
        if (opts?.tab != null) setTab(opts.tab);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, tab],
  );

  React.useEffect(() => {
    void fetchData();
  }, [tab]);

  const openNewUserDialog = () => {
    setEditingUser(null);
    setFormValues({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
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
      password: "",
      confirmPassword: "",
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
    if (!editingUser) {
      if (!formValues.password || formValues.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      if (formValues.password !== formValues.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }
    setSaving(true);
    try {
      if (editingUser) {
        await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formValues.name,
            email: formValues.email,
            role: formValues.role,
            status: formValues.status,
          }),
        });
      } else {
        await fetch(`/api/admin/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formValues.name,
            email: formValues.email,
            password: formValues.password,
            role: formValues.role,
            status: formValues.status,
          }),
        });
      }

      setDialogOpen(false);
      await fetchData({ page: 1, search, tab });
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
      render: (row) => {
        const isPendingClient = row.role === "CLIENT" && row.status === "INACTIVE";
        if (isPendingClient) {
          return (
            <div className="flex items-center gap-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="xs"
                    className="h-7 px-2 text-[11px]"
                    aria-label={`Approve ${row.email}`}
                  >
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm">
                      Approve registration?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {row.name} ({row.email}) will be able to sign in as a client.
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
                            body: JSON.stringify({ status: "ACTIVE" }),
                          });
                      await fetchData({ page, search, tab });
                      toast.success("Registration approved");
                        } finally {
                          setLoading(false);
                        }
                      }}
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
                    aria-label={`Reject ${row.email}`}
                  >
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm">
                      Reject registration?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      The account will be marked as rejected and moved to the Rejected tab. You can delete it there to remove permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-7 px-2 text-[11px]">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="h-7 px-3 text-[11px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await fetch(`/api/admin/users/${row.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "REJECTED" }),
                          });
                          await fetchData({ page, search, tab });
                          toast.success("Registration rejected");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        }
        return (
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
                        await fetchData({ page, search, tab });
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
                        await fetchData({ page, search, tab });
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
        );
      },
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

      <div className="flex gap-1 border-b border-border">
        {(
          [
            { value: "active" as const, label: "Active" },
            { value: "pending" as const, label: "Pending" },
            { value: "rejected" as const, label: "Rejected" },
          ] as const
        ).map(({ value, label }) => (
          <Button
            key={value}
            size="xs"
            variant={tab === value ? "secondary" : "ghost"}
            className="h-8 rounded-b-none px-3 text-[11px]"
            onClick={() => {
              setTab(value);
              setPage(1);
              void fetchData({ page: 1, tab: value });
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        page={page}
        pageSize={pageSize}
        total={total}
        isLoading={loading}
        onPageChange={(newPage) => {
          setPage(newPage);
          void fetchData({ page: newPage, tab });
        }}
        onSearchChange={(value) => {
          setSearch(value || undefined);
          void fetchData({ page: 1, search: value, tab });
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
              {!editingUser && (
                <>
                  <div className="space-y-1">
                    <label className="font-medium" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formValues.password}
                        onChange={handleFormChange}
                        className="h-7 pr-8 text-[11px]"
                        placeholder="Min 6 characters"
                        minLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-7 w-7 px-2 hover:bg-transparent"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium" htmlFor="confirmPassword">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formValues.confirmPassword}
                        onChange={handleFormChange}
                        className="h-7 pr-8 text-[11px]"
                        placeholder="Re-enter password"
                        minLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-7 w-7 px-2 hover:bg-transparent"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
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

