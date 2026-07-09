"use client";

// Topbar bell → dropdown of recent procurement activity (the audit feed),
// topped by a one-time caution about the demo's automatic data removal so a
// user who just signed up / signed in can't miss it.

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Loader2, Clock, AlertTriangle, X } from "lucide-react";
import { reportsApi } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

// Dismissal is remembered per-browser so the caution nags once, not forever.
const CAUTION_KEY = "wolf-demo-data-caution-dismissed";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCaution, setShowCaution] = useState(false);
  const ref = useRef(null);

  // Read the dismissed flag on mount so a prior dismissal sticks across reloads.
  useEffect(() => {
    try {
      setShowCaution(localStorage.getItem(CAUTION_KEY) !== "1");
    } catch {
      setShowCaution(true);
    }
  }, []);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const dismissCaution = () => {
    setShowCaution(false);
    try {
      localStorage.setItem(CAUTION_KEY, "1");
    } catch {
      /* ignore storage failures — worst case the caution reappears next load */
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && items === null && !loading) {
      setLoading(true);
      try {
        const r = await reportsApi.activity(8);
        setItems(r.data || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  };

  // Draw the unread dot while the caution is pending or there's fresh activity.
  const unread = showCaution || (items?.length ?? 0) > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
          </div>

          {/* Demo caution: automatic data removal. Dismissible, shown until acked. */}
          {showCaution && (
            <div className="flex items-start gap-2.5 border-b border-amber-100 bg-amber-50 px-4 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-800">Heads-up: automatic data removal</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                  This is a demo. Any data you add is automatically cleared after{" "}
                  <span className="font-medium">30 days of inactivity</span> — your login always stays.
                </p>
              </div>
              <button
                onClick={dismissCaution}
                aria-label="Dismiss caution"
                className="shrink-0 rounded p-0.5 text-amber-400 hover:bg-amber-100 hover:text-amber-600 transition"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-5 text-sm text-slate-400">
                <Loader2 size={15} className="animate-spin" /> Loading…
              </div>
            ) : !items || items.length === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-400">Nothing new yet.</p>
            ) : (
              items.map((it) => (
                <div key={it.id} className="px-4 py-3">
                  <p className="text-sm text-slate-800">{it.message || it.action}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={11} /> {timeAgo(it.createdAt)}
                    {it.actor ? ` · ${it.actor}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
