"use client";

// Loading & error surfaces. Skeletons beat spinners here: they reserve the
// final layout, so the page doesn't jump when data lands. The shimmer itself
// is the `.skeleton` class in globals.css.

import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/format";

export function Spinner({ className = "w-5 h-5" }) {
  return <Loader2 className={cn("animate-spin text-brand", className)} />;
}

export function LoadingScreen({ label = "Loading…" }) {
  return (
    <div className="min-h-screen grid place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wolf-w.png"
          alt=""
          className="w-12 h-12 object-contain animate-pulse"
        />
        <div className="flex items-center gap-2 text-fg-muted">
          <Spinner className="w-4 h-4" />
          <span className="text-sm">{label}</span>
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={cn("skeleton", className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-16 mt-2.5" />
      <Skeleton className="h-3 w-24 mt-3" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3, className = "" }) {
  return (
    <div className={cn("bg-surface rounded-2xl border border-border p-5", className)}>
      <Skeleton className="h-4 w-32 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5 mt-2.5", i % 2 ? "w-4/5" : "w-full")} />
      ))}
    </div>
  );
}

// Generic page skeleton — used by the route-level loading.jsx files.
export function PageSkeleton() {
  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72 mt-2.5" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </div>
  );
}

// List-page skeleton — header, toolbar, then a table.
export function ListSkeleton({ cols = 5 }) {
  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 mt-2.5" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <TableSkeleton cols={cols} rows={7} />
    </div>
  );
}

export function ErrorState({ message = "Something went wrong", onRetry }) {
  return (
    <div className="text-center py-16 text-fg-muted">
      <AlertTriangle className="w-8 h-8 mx-auto text-red-400 mb-2" />
      <p className="font-medium text-fg">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-brand text-sm mt-2 hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
