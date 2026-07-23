"use client";

// Non-blocking notifications. Replaces window.alert() everywhere: an alert
// freezes the tab and can't convey success, which is most of what we report.

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};
const DURATION = { success: 3500, info: 3500, error: 6000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Timers are cleared on unmount so a dismissed toast can't set state after.
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message) => {
      if (!message) return;
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, type, message: String(message) }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION[type] || 3500)
      );
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  // Stable identity so callers can safely put `toast` in effect dep arrays.
  const api = useRef({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  });
  api.current.success = (m) => push("success", m);
  api.current.error = (m) => push("error", m);
  api.current.info = (m) => push("info", m);

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[120] space-y-2 w-80 max-w-[calc(100vw-2rem)] no-print"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-3 rounded-xl border shadow-pop animate-slide-in ${
                TONES[t.type] || TONES.info
              }`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm flex-1 break-words">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="opacity-60 hover:opacity-100 transition shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
