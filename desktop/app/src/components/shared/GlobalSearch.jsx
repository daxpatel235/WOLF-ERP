"use client";

// ⌘K / Ctrl-K command palette. The topbar shows a compact trigger; the palette
// itself renders into a portal over a blurred scrim so it floats above the
// sticky header and the sidebar regardless of stacking context.
//
// Records (vendors / RFQs / quotations / POs / invoices) load once on first
// open and are then filtered client-side, so typing costs nothing. Pages are
// matched from a static list, which means the palette is also a navigator.

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  Users,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CornerDownLeft,
  X,
  Compass,
  LayoutDashboard,
  CheckCircle2,
  BarChart3,
  Settings,
  Building2,
  MessagesSquare,
} from "lucide-react";
import {
  vendorsApi,
  rfqsApi,
  quotationsApi,
  purchaseOrdersApi,
  invoicesApi,
} from "@/lib/api";
import { formatINR, cn } from "@/lib/format";

const EMPTY = { vendors: [], rfqs: [], quotations: [], pos: [], invoices: [] };

// Jump targets — searchable so "rep" reaches Reports without a data round-trip.
const PAGES = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview" },
  { label: "Vendors", href: "/vendors", icon: Users, keywords: "suppliers" },
  { label: "RFQs", href: "/rfqs", icon: FileText, keywords: "request for quotation" },
  { label: "Quotations", href: "/quotations", icon: FileSpreadsheet, keywords: "quotes bids" },
  { label: "Approvals", href: "/approvals", icon: CheckCircle2, keywords: "sign off pending" },
  { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, keywords: "po" },
  { label: "Invoices", href: "/invoices", icon: Receipt, keywords: "billing payments" },
  { label: "Reports", href: "/reports", icon: BarChart3, keywords: "analytics spend charts" },
  { label: "Organization", href: "/organization", icon: Building2, keywords: "team members" },
  { label: "Team Chat", href: "/organization/chat", icon: MessagesSquare, keywords: "messages" },
  { label: "Settings", href: "/settings", icon: Settings, keywords: "preferences profile" },
];

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState(EMPTY);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => setMounted(true), []);

  // Lazy-load the searchable records the first time the palette is opened.
  // A failing resource yields an empty list rather than sinking the others.
  const ensureLoaded = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const [v, r, qt, p, i] = await Promise.all([
        vendorsApi.list().catch(() => ({ data: [] })),
        rfqsApi.list().catch(() => ({ data: [] })),
        quotationsApi.list().catch(() => ({ data: [] })),
        purchaseOrdersApi.list().catch(() => ({ data: [] })),
        invoicesApi.list().catch(() => ({ data: [] })),
      ]);
      setData({
        vendors: v.data || [],
        rfqs: r.data || [],
        quotations: qt.data || [],
        pos: p.data || [],
        invoices: i.data || [],
      });
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  // ---- ⌘K / Ctrl-K to open, Esc to close ----
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Focus on open, reset the query on close, and lock the page behind the scrim.
  useEffect(() => {
    if (!open) {
      setQ("");
      setActive(0);
      return;
    }
    ensureLoaded();
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open, ensureLoaded]);

  const term = q.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!term) return [];
    const has = (...fields) =>
      fields.some((f) => String(f || "").toLowerCase().includes(term));

    const g = [
      {
        label: "Pages",
        icon: Compass,
        hits: PAGES.filter((p) => has(p.label, p.keywords))
          .slice(0, 4)
          .map((p) => ({
            key: `page-${p.href}`,
            icon: p.icon,
            primary: p.label,
            secondary: p.href,
            href: p.href,
          })),
      },
      {
        label: "Vendors",
        icon: Users,
        hits: data.vendors
          .filter((v) => has(v.name, v.id, v.category, v.email))
          .slice(0, 4)
          .map((v) => ({
            key: `vendor-${v.id}`,
            primary: v.name,
            secondary: [v.id, v.category].filter(Boolean).join(" · "),
            href: `/vendors/${v.id}`,
          })),
      },
      {
        label: "RFQs",
        icon: FileText,
        hits: data.rfqs
          .filter((r) => has(r.title, r.id, r.category))
          .slice(0, 4)
          .map((r) => ({
            key: `rfq-${r.id}`,
            primary: r.title,
            secondary: [r.id, r.status].filter(Boolean).join(" · "),
            href: `/rfqs/${r.id}`,
          })),
      },
      {
        label: "Quotations",
        icon: FileSpreadsheet,
        hits: data.quotations
          .filter((x) => has(x.rfqTitle, x.id, x.vendor))
          .slice(0, 4)
          .map((x) => ({
            key: `quote-${x.id}`,
            primary: x.rfqTitle || x.id,
            secondary: [x.vendor, formatINR(x.amount)].filter(Boolean).join(" · "),
            href: `/quotations/${x.id}`,
          })),
      },
      {
        label: "Purchase Orders",
        icon: ShoppingCart,
        hits: data.pos
          .filter((p) => has(p.vendor, p.id, p.status))
          .slice(0, 4)
          .map((p) => ({
            key: `po-${p.id}`,
            primary: p.id,
            secondary: [p.vendor, formatINR(p.amount)].filter(Boolean).join(" · "),
            href: `/purchase-orders/${p.id}`,
          })),
      },
      {
        label: "Invoices",
        icon: Receipt,
        hits: data.invoices
          .filter((i) => has(i.vendor, i.id, i.status))
          .slice(0, 4)
          .map((i) => ({
            key: `invoice-${i.id}`,
            primary: i.vendor,
            secondary: [i.id, formatINR(i.amount)].filter(Boolean).join(" · "),
            href: `/invoices/${i.id}`,
          })),
      },
    ];
    return g.filter((x) => x.hits.length);
  }, [term, data]);

  // Flattened for keyboard traversal — the arrow keys move across group
  // boundaries, so the highlighted row is always index `active` in here.
  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups]);

  useEffect(() => setActive(0), [term]);

  const go = useCallback(
    (href) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[active];
      if (hit) go(hit.href);
    }
  };

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let cursor = -1; // running index across groups, to match `active`

  return (
    <>
      {/* ---- Topbar trigger ---- */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 flex-1 max-w-xl mx-4 px-3 py-2 rounded-lg border border-border bg-surface-2/60 text-fg-muted text-sm hover:bg-surface hover:border-brand/40 hover:shadow-sm transition"
      >
        <Search size={16} className="shrink-0" />
        <span className="flex-1 text-left truncate">
          Search vendors, RFQs, invoices…
        </span>
        <kbd className="hidden sm:inline text-[10px] font-sans border border-border rounded px-1.5 py-0.5 text-fg-muted">
          ⌘K
        </kbd>
      </button>

      {/* ---- Palette ---- */}
      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 sm:pt-24 px-4">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-pop overflow-hidden animate-scale-in"
            >
              {/* Query row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search size={18} className="text-fg-muted shrink-0" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search vendors, RFQs, quotations, POs, invoices…"
                  className="flex-1 min-w-0 bg-transparent text-fg outline-none text-sm placeholder:text-fg-muted"
                />
                {loading && (
                  <Loader2 size={15} className="animate-spin text-fg-muted shrink-0" />
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close search"
                  className="shrink-0 p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[22rem] overflow-y-auto">
                {!term && (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm text-fg-muted">
                      Search across vendors, RFQs, quotations, POs &amp; invoices
                    </p>
                    <p className="text-xs text-fg-muted mt-1">
                      Try “steel”, “PO-2025”, or “reports”
                    </p>
                  </div>
                )}

                {term && loading && groups.length === 0 && (
                  <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-fg-muted">
                    <Loader2 size={15} className="animate-spin" /> Loading records…
                  </div>
                )}

                {term && !loading && groups.length === 0 && (
                  <p className="px-4 py-10 text-sm text-fg-muted text-center">
                    No matches for “{q}”.
                  </p>
                )}

                {groups.map((group) => (
                  <div key={group.label} className="py-1">
                    <p className="px-4 py-1 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">
                      {group.label}
                    </p>
                    {group.hits.map((hit) => {
                      cursor += 1;
                      const isActive = cursor === active;
                      const Icon = hit.icon || group.icon;
                      const index = cursor;
                      return (
                        <button
                          key={hit.key}
                          type="button"
                          data-active={isActive}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => go(hit.href)}
                          className={cn(
                            "w-full text-left px-4 py-2 flex items-center gap-3 transition",
                            isActive ? "bg-surface-2" : "hover:bg-surface-2/60"
                          )}
                        >
                          <span
                            className={cn(
                              "grid place-items-center w-8 h-8 rounded-lg shrink-0 transition",
                              isActive
                                ? "bg-brand/10 text-brand"
                                : "bg-surface-2 text-fg-muted"
                            )}
                          >
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-fg truncate">
                              {hit.primary}
                            </span>
                            <span className="block text-xs text-fg-muted truncate">
                              {hit.secondary}
                            </span>
                          </span>
                          <CornerDownLeft
                            size={14}
                            className={cn(
                              "text-fg-muted shrink-0 transition-opacity",
                              isActive ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Hint footer */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-surface-2/50 text-[11px] text-fg-muted">
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 py-px bg-surface">↑</kbd>
                  <kbd className="border border-border rounded px-1 py-px bg-surface">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 py-px bg-surface">↵</kbd>
                  to open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border border-border rounded px-1 py-px bg-surface">esc</kbd>
                  to close
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
