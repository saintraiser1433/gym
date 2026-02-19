"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type Column<T> = {
  key: keyof T;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  onSearchChange?: (value: string) => void;
  isLoading?: boolean;
};

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  onSearchChange,
  isLoading,
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(search);
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center gap-1 text-[11px]"
      >
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 max-w-[160px] px-2 text-[11px]"
        />
        <Button type="submit" size="xs" variant="outline" className="h-7 px-2 text-[11px]">
          Search
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={String(col.key)}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length}>Loading…</TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>No records found.</TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                {columns.map((col) => {
                  const rawValue = row[col.key] as any;

                  // Special styling for status-like fields
                  if (
                    typeof rawValue === "string" &&
                    String(col.key).toLowerCase().includes("status")
                  ) {
                    const upper = rawValue.toUpperCase();
                    const formatted =
                      upper === "FAILED"
                        ? "Rejected"
                        : upper.charAt(0) + upper.slice(1).toLowerCase();

                    const isActive =
                      upper === "ACTIVE" || upper === "PAID" || upper === "COMPLETED";

                    const badgeClass = isActive
                      ? "from-emerald-500 via-sky-500 to-blue-500"
                      : "from-red-500 via-rose-500 to-orange-500";

                    return (
                      <TableCell key={String(col.key)}>
                        <span
                          className={`inline-flex items-center rounded-full bg-gradient-to-r ${badgeClass} px-2 py-0.5 text-[11px] font-medium text-white shadow-sm`}
                        >
                          {formatted}
                        </span>
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell key={String(col.key)}>
                      {col.render ? col.render(row) : rawValue}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-end text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span>Rows per page</span>
            <select
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
              value={pageSize}
              disabled={!onPageSizeChange}
              onChange={(e) =>
                onPageSizeChange?.(Number(e.target.value) || pageSize)
              }
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <span>
            Page {page} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={page <= 1 || !onPageChange}
              onClick={() => onPageChange?.(1)}
            >
              {"<<"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={page <= 1 || !onPageChange}
              onClick={() => onPageChange?.(page - 1)}
            >
              {"<"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={page >= pageCount || !onPageChange}
              onClick={() => onPageChange?.(page + 1)}
            >
              {">"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={page >= pageCount || !onPageChange}
              onClick={() => onPageChange?.(pageCount)}
            >
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

