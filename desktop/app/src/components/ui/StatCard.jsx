"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "./kit";
import { Sparkline } from "./Chart";
import { cn } from "@/lib/format";

const TONES = {
  brand: "bg-brand/10 text-brand",
  sky: "bg-sky-500/10 text-sky-600",
  green: "bg-green-500/10 text-green-600",
  emerald: "bg-emerald-500/10 text-emerald-600",
  blue: "bg-blue-500/10 text-brand",
  amber: "bg-amber-500/10 text-amber-600",
  violet: "bg-violet-500/10 text-violet-600",
  purple: "bg-purple-500/10 text-purple-600",
  red: "bg-red-500/10 text-red-600",
};

// Concrete stroke colors for the sparkline (SVG needs a value, not a class).
const SPARK = {
  brand: "#2563eb",
  sky: "#0284c7",
  green: "#059669",
  emerald: "#059669",
  blue: "#3b82f6",
  amber: "#d97706",
  violet: "#7c3aed",
  purple: "#9333ea",
  red: "#dc2626",
};

/**
 * Headline metric tile.
 *
 * @param delta  % change — renders an up/down pill when provided
 * @param spark  trend series — draws a sparkline hugging the card's base
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  hint,
  delta,
  spark,
  loading = false,
  className = "",
}) {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const up = (delta ?? 0) >= 0;

  return (
    <Card
      className={cn(
        "group overflow-hidden flex flex-col p-5 shadow-card transition-all duration-200 ease-spring hover:border-brand/40 hover:shadow-card-hover hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-fg-muted">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-fg tracking-tight tabular-nums truncate">
            {loading ? "—" : value}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {showDelta && !loading && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums",
                  up ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                )}
              >
                {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(delta)}%
              </span>
            )}
            {hint && <p className="text-xs text-fg-muted truncate">{hint}</p>}
          </div>
        </div>
        {Icon && (
          <div
            className={cn(
              "p-2.5 rounded-xl ring-1 ring-inset ring-current/10 shrink-0 transition-transform duration-200 ease-spring group-hover:scale-110 group-hover:-rotate-3",
              TONES[tone] || TONES.brand
            )}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      {spark && spark.length > 1 && (
        <div className="mt-3 -mx-5 -mb-5 h-10">
          <Sparkline data={spark} stroke={SPARK[tone] || SPARK.brand} />
        </div>
      )}
    </Card>
  );
}

export default StatCard;
