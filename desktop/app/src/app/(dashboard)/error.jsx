"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/kit";

// Catches render/data errors anywhere under the dashboard so a single broken
// page shows a recoverable message instead of blanking the whole app.
export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto mt-10">
      <div className="bg-surface border border-border rounded-2xl shadow-card text-center py-12 px-6">
        <span className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
          <AlertTriangle className="w-7 h-7" />
        </span>
        <h2 className="text-lg font-bold text-fg">This page hit a problem</h2>
        <p className="text-sm text-fg-muted mt-1.5 max-w-sm mx-auto">
          {error?.message || "Something went wrong while loading this view."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={reset}>
            <RotateCw size={16} /> Try again
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost">
              <LayoutDashboard size={16} /> Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
