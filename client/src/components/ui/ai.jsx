"use client";

// Shared building blocks for the AI-powered features.
// Keeps the violet "AI" styling and the enabled-check in one place so every
// page wires AI the same way.

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { aiApi } from "@/lib/api";
import { cn } from "@/lib/format";

// Module-level cache so we only hit /ai/status once per page load.
let _statusPromise = null;

export function useAiEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (!_statusPromise) _statusPromise = aiApi.status().catch(() => ({ enabled: false }));
    let alive = true;
    _statusPromise.then((s) => alive && setEnabled(Boolean(s?.enabled)));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}

// Full AI status: { enabled, chat }. Reuses the same cached /ai/status fetch.
// `chat` reflects whether Level 3 RAG chat (embeddings) is configured.
export function useAiStatus() {
  const [status, setStatus] = useState({ enabled: false, chat: false });
  useEffect(() => {
    if (!_statusPromise) _statusPromise = aiApi.status().catch(() => ({ enabled: false }));
    let alive = true;
    _statusPromise.then(
      (s) => alive && setStatus({ enabled: Boolean(s?.enabled), chat: Boolean(s?.chat) })
    );
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

// A small violet "ask AI" button with a built-in spinner.
export function AiButton({ onClick, loading, disabled, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition shadow-sm",
        "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
      {children}
    </button>
  );
}

// The framed panel AI output renders into (gradient border + sparkles header).
export function AiPanel({ title = "AI assistant", children, footer }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-violet-600 text-white">
          <Sparkles size={14} />
        </span>
        <span className="text-sm font-semibold text-violet-900">{title}</span>
      </div>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
      {footer && <div className="mt-3 pt-3 border-t border-violet-100">{footer}</div>}
    </div>
  );
}

// Inline loading row used while a request is in flight.
export function AiThinking({ label = "Thinking…" }) {
  return (
    <div className="flex items-center gap-2 text-sm text-violet-700">
      <Loader2 size={15} className="animate-spin" /> {label}
    </div>
  );
}

// Maps a risk/severity level to badge classes (low/medium/high, pass/review/fail).
export function levelClass(level = "") {
  const l = String(level).toLowerCase();
  if (/(low|pass|info)/.test(l)) return "bg-emerald-100 text-emerald-700";
  if (/(medium|review|warning)/.test(l)) return "bg-amber-100 text-amber-700";
  if (/(high|fail|critical)/.test(l)) return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}
