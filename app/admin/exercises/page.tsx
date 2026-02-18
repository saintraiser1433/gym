"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";

type ExerciseRow = {
  id: string;
  name: string;
  category?: string | null;
  muscleGroup?: string | null;
  difficulty?: string | null;
};

export default function AdminExercisesPage() {
  const [rows, setRows] = React.useState<ExerciseRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);

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
        const res = await fetch(`/api/admin/exercises?${params.toString()}`);
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

  const columns: Column<ExerciseRow>[] = [
    { key: "name", header: "Name" },
    { key: "category", header: "Category" },
    { key: "muscleGroup", header: "Muscle group" },
    { key: "difficulty", header: "Difficulty" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Exercises</h1>
          <p className="text-sm text-muted-foreground">
            Manage the exercise library for workouts.
          </p>
        </div>
        <Button size="xs" className="h-7 px-2 text-[11px]">
          New Exercise
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
    </div>
  );
}

