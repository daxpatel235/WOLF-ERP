"use client";

// Portal-rendered dialog + a promise-based replacement for window.confirm().
// The portal matters: the topbar is sticky and the sidebar is transformed, so
// an in-tree overlay would be trapped inside their stacking contexts.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./kit";
import { cn } from "@/lib/format";

export function Modal({
  open,
  title,
  onClose,
  children,
  width = "max-w-md",
  footer,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex flex-col max-h-[calc(100vh-2rem)] bg-surface rounded-2xl shadow-pop w-full animate-scale-in border border-border",
          width
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border shrink-0">
            <h3 className="font-bold text-fg tracking-tight truncate">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 -mr-1 p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2 transition"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Promise-based confirm. `const ok = await confirm({ ... })` reads like
// window.confirm but doesn't freeze the tab or look like a browser alert.
// ---------------------------------------------------------------------------

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(
    (opts = {}) => new Promise((resolve) => setState({ opts, resolve })),
    []
  );

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        title={state?.opts.title || "Are you sure?"}
        onClose={() => close(false)}
      >
        <p className="text-sm text-fg-muted whitespace-pre-line">
          {state?.opts.message || "Please confirm this action."}
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => close(false)}>
            {state?.opts.cancelLabel || "Cancel"}
          </Button>
          <Button
            variant={state?.opts.danger ? "danger" : "primary"}
            onClick={() => close(true)}
          >
            {state?.opts.confirmLabel || "Confirm"}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a <ConfirmProvider>");
  return ctx;
}
