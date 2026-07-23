"use client";

// One table to replace the hand-rolled <table> on every list page.
//
// Sorting, filtering, searching and pagination all happen client-side: the
// Wolf list endpoints return the full collection, so doing it here keeps every
// interaction instant and needs no new API surface. If a list ever outgrows
// that, swap the internals for server params — the page-level API won't change.
//
//   <DataTable
//     columns={[{ key: "name", label: "Vendor", sortable: true, render: r => … }]}
//     rows={vendors}
//     rowHref={(r) => `/vendors/${r.id}`}
//   />

import { useState, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  FileText,
  Search,
  X,
} from "lucide-react";
import { EmptyState } from "./kit";
import { TableSkeleton, ErrorState } from "./feedback";
import { exportToCSV, exportToExcel, exportToPDF, printPage } from "@/lib/export";
import { cn } from "@/lib/format";

// Values sort as numbers when both sides are numeric, else as text.
function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const na = Number(a);
  const nb = Number(b);
  if (!isNaN(na) && !isNaN(nb) && String(a).trim() !== "" && String(b).trim() !== "") {
    return na - nb;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function sortValue(col, row) {
  if (col.sortValue) return col.sortValue(row);
  if (col.exportValue) return col.exportValue(row);
  return row[col.key];
}

export function DataTable({
  columns,
  rows = [],
  loading = false,
  error = null,
  onRetry,
  rowHref,
  onRowClick,
  searchable = true,
  searchPlaceholder = "Search…",
  searchKeys,
  pageSize = 12,
  exportName = "export",
  title,
  emptyTitle = "Nothing here yet",
  emptyHint = "Records will appear once you create them.",
  emptyIcon,
  toolbar,
  className = "",
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(null); // { key, dir: 'asc' | 'desc' }
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

  // Keeps typing responsive while the filter pass over every row lags a frame.
  const deferredQuery = useDeferredValue(query);

  const filterColumns = useMemo(() => columns.filter((c) => c.filter), [columns]);

  // ---- search → filter → sort ----
  const processed = useMemo(() => {
    let out = rows;

    const q = deferredQuery.trim().toLowerCase();
    if (q) {
      const keys = searchKeys || columns.filter((c) => c.export !== false).map((c) => c.key);
      out = out.filter((r) =>
        keys.some((k) => String(r[k] ?? "").toLowerCase().includes(q))
      );
    }

    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      out = out.filter((r) => String(r[key] ?? "") === value);
    }

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        // Copy first — Array.sort mutates, and `rows` is the caller's array.
        out = [...out].sort((a, b) => {
          const res = compare(sortValue(col, a), sortValue(col, b));
          return sort.dir === "asc" ? res : -res;
        });
      }
    }

    return out;
  }, [rows, deferredQuery, filters, sort, columns, searchKeys]);

  const pages = Math.max(1, Math.ceil(processed.length / pageSize));
  // A filter change can strand you past the last page — clamp rather than
  // showing an empty table.
  const current = Math.min(page, pages);
  const pageRows = processed.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key) =>
    setSort((s) =>
      s?.key !== key
        ? { key, dir: "asc" }
        : s.dir === "asc"
        ? { key, dir: "desc" }
        : null
    );

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const openRow = (row) => {
    if (onRowClick) return onRowClick(row);
    if (rowHref) router.push(rowHref(row));
  };

  const sortDir = (key) => (sort?.key === key ? sort.dir : null);
  const clickable = Boolean(rowHref || onRowClick);
  // Exports always cover the full filtered set, not just the visible page.
  const exportRows = processed;

  return (
    <div className={className}>
      {/* ---- Toolbar ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="pl-9 pr-8 py-2 w-full sm:w-64 rounded-lg border border-border bg-surface text-fg text-sm placeholder:text-fg-muted transition focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {filterColumns.map((c) => (
            <select
              key={c.key}
              value={filters[c.key] ?? ""}
              onChange={(e) => setFilter(c.key, e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-fg text-sm transition focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">All {c.label.toLowerCase()}</option>
              {c.filter.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            title="Export CSV"
            onClick={() => exportToCSV(columns, exportRows, exportName)}
            className="p-2 rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg transition"
          >
            <Download size={16} />
          </button>
          <button
            title="Export Excel"
            onClick={() => exportToExcel(columns, exportRows, exportName)}
            className="px-2 py-2 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-surface-2 transition"
          >
            XLS
          </button>
          <button
            title="Export PDF"
            onClick={() => exportToPDF(columns, exportRows, exportName, title)}
            className="px-2 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-surface-2 transition"
          >
            PDF
          </button>
          <button
            title="Print"
            onClick={printPage}
            className="p-2 rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg transition no-print"
          >
            <Printer size={16} />
          </button>
          {toolbar}
        </div>
      </div>

      {/* ---- Body ---- */}
      {loading ? (
        <TableSkeleton cols={columns.length} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={onRetry} />
      ) : processed.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border">
          <EmptyState
            icon={emptyIcon || FileText}
            title={query || Object.values(filters).some(Boolean) ? "No matches" : emptyTitle}
            hint={
              query || Object.values(filters).some(Boolean)
                ? "Try a different search or clear the filters."
                : emptyHint
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-fg-muted">
                  <tr>
                    {columns.map((c) => {
                      const dir = sortDir(c.key);
                      return (
                        <th
                          key={c.key}
                          onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                          className={cn(
                            "px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap",
                            c.align === "right" && "text-right",
                            c.sortable &&
                              "cursor-pointer select-none hover:text-fg transition-colors"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              c.align === "right" && "flex-row-reverse"
                            )}
                          >
                            {c.label}
                            {c.sortable &&
                              (dir === "asc" ? (
                                <ArrowUp size={13} className="text-brand" />
                              ) : dir === "desc" ? (
                                <ArrowDown size={13} className="text-brand" />
                              ) : (
                                <ChevronsUpDown size={13} className="opacity-40" />
                              ))}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={clickable ? () => openRow(row) : undefined}
                      className={cn(
                        "border-t border-border transition-colors",
                        clickable && "cursor-pointer hover:bg-surface-2/60"
                      )}
                    >
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            "px-4 py-3 text-fg",
                            c.align === "right" && "text-right"
                          )}
                        >
                          {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: each row becomes a card of label → value pairs */}
          <div className="md:hidden space-y-3">
            {pageRows.map((row) => (
              <div
                key={row.id}
                onClick={clickable ? () => openRow(row) : undefined}
                className={cn(
                  "bg-surface rounded-2xl border border-border p-4 space-y-2.5",
                  clickable && "cursor-pointer active:bg-surface-2"
                )}
              >
                {columns.map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted shrink-0 pt-0.5">
                      {c.label}
                    </span>
                    <span className="text-sm text-fg text-right min-w-0">
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- Pagination ---- */}
      {!loading && !error && processed.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-fg-muted">
          <span className="tabular-nums">
            {processed.length === rows.length
              ? `${rows.length} records`
              : `${processed.length} of ${rows.length} records`}
          </span>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
                className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 tabular-nums">
                {current} / {pages}
              </span>
              <button
                disabled={current >= pages}
                onClick={() => setPage(current + 1)}
                className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DataTable;
