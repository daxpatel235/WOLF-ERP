"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Trash2, X, ShieldCheck, Clock } from "lucide-react";

// A polished, animated disclaimer modal. Driven entirely by the one-shot
// `notice` the server returns on login/register:
//   • kind: "welcome"    → first sign-in, explains the demo + 30-day wipe rule
//   • kind: "data-wiped" → returning after 30+ days idle, explains the reset
// Everything (title, message, away-days, colour, icon, button) is dynamic.
export default function DemoNotice() {
  const { notice, clearNotice } = useAuth();
  const [show, setShow] = useState(false);

  // Trigger the entrance transition on the next frame after a notice arrives.
  useEffect(() => {
    if (!notice) {
      setShow(false);
      return;
    }
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, [notice]);

  if (!notice) return null;

  const wiped = notice.kind === "data-wiped";

  const theme = wiped
    ? {
        grad: "from-rose-500 to-orange-500",
        ring: "ring-rose-100",
        chip: "bg-rose-50 text-rose-600",
        Icon: Trash2,
        cta: "Start fresh",
      }
    : {
        grad: "from-blue-600 to-indigo-600",
        ring: "ring-blue-100",
        chip: "bg-blue-50 text-blue-600",
        Icon: Sparkles,
        cta: "Let's go",
      };
  const { Icon } = theme;

  const close = () => {
    setShow(false);
    // Let the exit animation play before unmounting.
    setTimeout(clearNotice, 200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={notice.title}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-300 ${
          show ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        {/* Gradient header */}
        <div className={`relative bg-gradient-to-r ${theme.grad} px-6 pb-12 pt-7 text-white`}>
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X size={18} />
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
            Wolf ERP · Demo
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight">{notice.title}</h2>
        </div>

        {/* Floating icon */}
        <div className="-mt-8 flex justify-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg ring-4 ${theme.ring}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-full ${theme.chip}`}>
              <Icon size={24} />
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-3 text-center">
          {wiped && typeof notice.awayDays === "number" && (
            <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
              <Clock size={13} /> You were away for {notice.awayDays} days
            </div>
          )}

          <p className="text-sm leading-relaxed text-slate-600">{notice.message}</p>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck size={13} className="text-emerald-500" />
            Your login is always safe — only your workspace data resets.
          </div>

          <button
            onClick={close}
            className={`mt-5 w-full rounded-xl bg-gradient-to-r ${theme.grad} px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[.99]`}
          >
            {theme.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
