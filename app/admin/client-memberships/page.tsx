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

type ClientMembershipRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  membershipName: string;
  startDate: string;
  endDate: string;
  startDateRaw: string;
  endDateRaw: string;
  status: string;
};

type ClientOption = { id: string; name: string; email: string };
type MembershipOption = { id: string; name: string };

export default function AdminClientMembershipsPage() {
  const [rows, setRows] = React.useState<ClientMembershipRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [clients, setClients] = React.useState<ClientOption[]>([]);
  const [memberships, setMemberships] = React.useState<MembershipOption[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState<ClientMembershipRow | null>(null);
  const [formValues, setFormValues] = React.useState({
    clientId: "",
    membershipId: "",
    startDate: "",
    endDate: "",
  });
  const [editFormValues, setEditFormValues] = React.useState({
    startDate: "",
    endDate: "",
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
        const res = await fetch(`/api/admin/registrations?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        const data = json.data ?? [];
        setRows(
          data.map((r: any) => ({
            id: r.id,
            clientName: r.client?.user?.name ?? "—",
            clientEmail: r.client?.user?.email ?? "—",
            membershipName: r.membership?.name ?? "—",
            startDate: new Date(r.startDate).toLocaleDateString(),
            endDate: new Date(r.endDate).toLocaleDateString(),
            startDateRaw: new Date(r.startDate).toISOString().slice(0, 10),
            endDateRaw: new Date(r.endDate).toISOString().slice(0, 10),
            status: r.status ?? "ACTIVE",
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

  const fetchClients = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients", { cache: "no-store" });
      const json = await res.json();
      setClients(json.data ?? []);
    } catch {
      setClients([]);
    }
  }, []);

  const fetchMemberships = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/memberships?page=1&pageSize=100", {
        cache: "no-store",
      });
      const json = await res.json();
      setMemberships((json.data ?? []).map((m: any) => ({ id: m.id, name: m.name })));
    } catch {
      setMemberships([]);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
    void fetchClients();
    void fetchMemberships();
  }, []);

  const openAssignDialog = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setFormValues({
      clientId: "",
      membershipId: "",
      startDate: today.toISOString().slice(0, 10),
      endDate: nextMonth.toISOString().slice(0, 10),
    });
    setEditingRow(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: ClientMembershipRow) => {
    setEditingRow(row);
    setEditFormValues({
      startDate: row.startDateRaw,
      endDate: row.endDateRaw,
      status: row.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setEditFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setSaving(true);
    try {
      const start = new Date(editFormValues.startDate);
      const end = new Date(editFormValues.endDate);
      await fetch(`/api/admin/client-memberships/${editingRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          status: editFormValues.status,
        }),
      });
      setEditDialogOpen(false);
      await fetchData({ page, search });
      toast.success("Client membership updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
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
      const start = new Date(formValues.startDate);
      const end = new Date(formValues.endDate);
      await fetch("/api/admin/client-memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formValues.clientId,
          membershipId: formValues.membershipId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      });
      setDialogOpen(false);
      await fetchData({ page: 1, search });
      toast.success("Client assigned to membership");
    } catch {
      toast.error("Failed to assign membership");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ClientMembershipRow>[] = [
    { key: "clientName", header: "Client" },
    { key: "clientEmail", header: "Email" },
    { key: "membershipName", header: "Membership" },
    { key: "startDate", header: "Start" },
    { key: "endDate", header: "End" },
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
            aria-label={`Edit ${row.clientName}`}
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
                aria-label={`Delete ${row.clientName}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Remove client membership?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the plan assignment for {row.clientName} (
                  {row.membershipName}). This action cannot be undone.
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
                      await fetch(`/api/admin/client-memberships/${row.id}`, {
                        method: "DELETE",
                      });
                      await fetchData({ page, search });
                      toast.success("Client membership removed");
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Client Memberships</h1>
          <p className="text-sm text-muted-foreground">
            Tie clients to membership plans. Includes assignments from approved
            applications (Payments) and manual &quot;Assign to client&quot;.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="xs"
                variant="outline"
                className="h-7 px-2 text-[11px]"
              >
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">
                  Clear all client memberships?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all client membership records (and their
                  renewals). This is usually only for testing. This action
                  cannot be undone.
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
                      const res = await fetch("/api/admin/client-memberships", {
                        method: "DELETE",
                      });
                      if (!res.ok) {
                        const j = await res.json().catch(() => null);
                        toast.error(
                          j?.error ??
                            "Failed to clear client memberships. Please try again.",
                        );
                      } else {
                        await fetchData({ page: 1, search });
                        toast.success("All client memberships cleared");
                      }
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="xs"
            className="h-7 px-2 text-[11px]"
            onClick={openAssignDialog}
          >
            Assign to client
          </Button>
        </div>
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

      {editDialogOpen && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">Edit client membership</h2>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {editingRow.clientName} — {editingRow.membershipName}
            </p>
            <form onSubmit={handleSubmitEdit} className="space-y-3 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="editStartDate">
                    Start date
                  </label>
                  <Input
                    id="editStartDate"
                    name="startDate"
                    type="date"
                    value={editFormValues.startDate}
                    onChange={handleEditFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="editEndDate">
                    End date
                  </label>
                  <Input
                    id="editEndDate"
                    name="endDate"
                    type="date"
                    value={editFormValues.endDate}
                    onChange={handleEditFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="editStatus">
                  Status
                </label>
                <select
                  id="editStatus"
                  name="status"
                  value={editFormValues.status}
                  onChange={handleEditFormChange}
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setEditDialogOpen(false)}
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

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-md bg-card p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">Assign membership to client</h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="font-medium" htmlFor="clientId">
                  Client
                </label>
                <select
                  id="clientId"
                  name="clientId"
                  value={formValues.clientId}
                  onChange={handleFormChange}
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-medium" htmlFor="membershipId">
                  Membership plan
                </label>
                <select
                  id="membershipId"
                  name="membershipId"
                  value={formValues.membershipId}
                  onChange={handleFormChange}
                  className="h-7 w-full rounded-md border bg-transparent px-2 text-[11px]"
                  required
                >
                  <option value="">Select plan</option>
                  {memberships.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="startDate">
                    Start date
                  </label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formValues.startDate}
                    onChange={handleFormChange}
                    className="h-7 text-[11px]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium" htmlFor="endDate">
                    End date
                  </label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formValues.endDate}
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
                  {saving ? "Saving..." : "Assign"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
