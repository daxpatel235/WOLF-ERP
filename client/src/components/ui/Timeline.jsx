"use client";

// Vertical activity rail with a connecting spine. Used by the activity feed and
// the dashboard's recent-events card, so both read identically.

import { Circle } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/format";

const TONES = {
  brand: "text-brand bg-brand/10",
  green: "text-emerald-600 bg-emerald-500/10",
  red: "text-red-600 bg-red-500/10",
  blue: "text-brand bg-blue-500/10",
  violet: "text-violet-600 bg-violet-500/10",
  amber: "text-amber-600 bg-amber-500/10",
  gray: "text-fg-muted bg-surface-2",
};

/**
 * @param items [{ id, title, description, time, icon, tone, href }]
 */
export function Timeline({ items = [], emptyLabel = "No activity yet", className = "" }) {
  if (!items.length) {
    return <p className="text-sm text-fg-muted py-8 text-center">{emptyLabel}</p>;
  }

  return (
    <ol className={cn("relative", className)}>
      {items.map((it, i) => {
        const Icon = it.icon || Circle;
        const last = i === items.length - 1;
        return (
          <li key={it.id ?? i} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Spine — stops at the last dot so it doesn't dangle. */}
            {!last && (
              <span
                className="absolute left-[15px] top-9 bottom-0 w-px bg-border"
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative grid place-items-center w-8 h-8 rounded-lg shrink-0 ring-4 ring-surface",
                TONES[it.tone] || TONES.gray
              )}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-fg leading-snug">{it.title}</p>
                {it.time && (
                  <span className="text-xs text-fg-muted whitespace-nowrap shrink-0 pt-0.5">
                    {timeAgo(it.time)}
                  </span>
                )}
              </div>
              {it.description && (
                <p className="text-sm text-fg-muted mt-0.5 truncate">{it.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default Timeline;
