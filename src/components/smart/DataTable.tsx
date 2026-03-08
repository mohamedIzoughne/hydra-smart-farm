import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from "lucide-react";

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function DataTable({ columns, rows, loading, emptyMessage = "Aucune donnée", onRowClick }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  if (loading) {
    return (
      <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
        <div className="animate-pulse space-y-0">
          <div className="h-12 bg-muted/60" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 border-t border-border/40 bg-muted/20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border/60 rounded-2xl overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground",
                    col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors duration-200"
                  )}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        : <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center">
                  <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-t border-border/40 transition-colors duration-150",
                    onRowClick && "cursor-pointer",
                    "hover:bg-primary/[0.03]",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3.5">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
