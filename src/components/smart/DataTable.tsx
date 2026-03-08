import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from "lucide-react";

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function DataTable({ columns, rows, loading, emptyMessage = "Aucune donnée", emptyIcon, onRowClick }: DataTableProps) {
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
      <div className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm">
        <div className="animate-pulse">
          <div className="h-14 bg-muted/40 border-b border-border/40" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border/20 last:border-0">
              <div className="h-3 bg-muted/50 rounded-full w-16" />
              <div className="h-3 bg-muted/30 rounded-full flex-1 max-w-[200px]" />
              <div className="h-3 bg-muted/30 rounded-full w-20" />
              <div className="h-3 bg-muted/20 rounded-full w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/80",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors duration-200 group"
                  )}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className={cn("inline-flex items-center gap-2", col.align === "right" && "justify-end")}>
                    {col.label}
                    {col.sortable && (
                      <span className="inline-flex">
                        {sortKey === col.key
                          ? sortDir === "asc"
                            ? <ArrowUp className="w-3.5 h-3.5 text-primary" />
                            : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          : <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                        }
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    {emptyIcon || <Inbox className="w-12 h-12 text-muted-foreground/15" strokeWidth={1.5} />}
                    <p className="text-sm text-muted-foreground font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "group border-t border-border/30 transition-all duration-200",
                    onRowClick && "cursor-pointer",
                    "hover:bg-primary/[0.04] hover:shadow-[inset_3px_0_0_hsl(var(--primary))]",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-6 py-4 transition-colors duration-200",
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      )}
                    >
                      {col.render ? col.render(row[col.key], row) : (
                        <span className="text-foreground/80">{String(row[col.key] ?? "—")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > 0 && (
        <div className="px-6 py-3 border-t border-border/30 bg-muted/20">
          <p className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">
            {sorted.length} résultat{sorted.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
