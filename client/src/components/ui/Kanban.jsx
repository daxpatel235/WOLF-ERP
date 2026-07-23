"use client";

// Drag-and-drop pipeline board on the native HTML5 DnD API — no dependency,
// no drag layer to keep in sync. Group any records by a status field and move
// them between columns:
//
//   <Kanban columns={COLS} items={rows} groupBy="status"
//     renderCard={(r) => <div>{r.id}</div>}
//     onMove={(row, next) => api.setStatus(row.id, next)} />

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/format";
import { Skeleton } from "./feedback";

export function Kanban({
  columns,
  items = [],
  groupBy,
  renderCard,
  onMove,
  cardHref,
  loading = false,
  emptyLabel = "Nothing here",
}) {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(columns.map((c) => [c.key, []]));
    items.forEach((it) => {
      const key = String(it[groupBy]);
      if (map[key]) map[key].push(it);
    });
    return map;
  }, [columns, items, groupBy]);

  const handleDrop = (colKey, e) => {
    e.preventDefault();
    setDragOver(null);
    setDragging(null);
    const id = e.dataTransfer.getData("text/plain");
    const row = items.find((r) => String(r.id) === id);
    if (row && String(row[groupBy]) !== colKey) onMove?.(row, colKey);
  };

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(230px,1fr))]">
        {columns.map((c) => (
          <div key={c.key} className="bg-surface-2/50 rounded-2xl border border-border p-3">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-20 w-full mb-2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(230px,1fr))] min-w-[min(100%,900px)] items-start">
        {columns.map((col) => {
          const rows = grouped[col.key] || [];
          const isOver = dragOver === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.key);
              }}
              onDragLeave={() => setDragOver((k) => (k === col.key ? null : k))}
              onDrop={(e) => handleDrop(col.key, e)}
              className={cn(
                "rounded-2xl border p-3 transition-colors min-h-[8rem]",
                isOver
                  ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                  : "border-border bg-surface-2/40"
              )}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    col.color || "bg-fg-muted/40"
                  )}
                />
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted truncate">
                  {col.label}
                </p>
                <span className="ml-auto text-xs font-semibold text-fg-muted tabular-nums bg-surface border border-border rounded-full px-1.5">
                  {rows.length}
                </span>
              </div>

              <div className="space-y-2">
                {rows.length === 0 && (
                  <p className="text-xs text-fg-muted text-center py-6">{emptyLabel}</p>
                )}
                {rows.map((row) => (
                  <div
                    key={row.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(row.id));
                      e.dataTransfer.effectAllowed = "move";
                      setDragging(String(row.id));
                    }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => cardHref && router.push(cardHref(row))}
                    className={cn(
                      "bg-surface border border-border rounded-xl p-3 shadow-card transition-all",
                      "hover:border-brand/40 hover:shadow-card-hover active:cursor-grabbing cursor-grab",
                      cardHref && "cursor-pointer",
                      dragging === String(row.id) && "opacity-40"
                    )}
                  >
                    {renderCard ? renderCard(row) : String(row.id)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Kanban;
