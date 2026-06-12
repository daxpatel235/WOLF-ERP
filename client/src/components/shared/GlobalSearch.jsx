"use client";

// Topbar global search. Loads vendors / RFQs / invoices once on first focus,
// then filters client-side and shows grouped, clickable results.

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Users, FileText, Receipt } from "lucide-react";
import { vendorsApi, rfqsApi, invoicesApi } from "@/lib/api";
import { formatINR } from "@/lib/format";

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState({ vendors: [], rfqs: [], invoices: [] });
  const boxRef = useRef(null);

  // Lazy-load the searchable records the first time the user focuses the box.
  const ensureLoaded = async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const [v, r, i] = await Promise.all([
        vendorsApi.list().catch(() => ({ data: [] })),
        rfqsApi.list().catch(() => ({ data: [] })),
        invoicesApi.list().catch(() => ({ data: [] })),
      ]);
      setData({ vendors: v.data || [], rfqs: r.data || [], invoices: i.data || [] });
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // Close on outside click.
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const term = q.trim().toLowerCase();
  const match = (s) => String(s || "").toLowerCase().includes(term);
  const results = !term
    ? { vendors: [], rfqs: [], invoices: [] }
    : {
        vendors: data.vendors.filter((v) => match(v.name) || match(v.id) || match(v.category)).slice(0, 4),
        rfqs: data.rfqs.filter((r) => match(r.title) || match(r.id) || match(r.category)).slice(0, 4),
        invoices: data.invoices.filter((i) => match(i.vendor) || match(i.id)).slice(0, 4),
      };
  const total = results.vendors.length + results.rfqs.length + results.invoices.length;

  const go = (href) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  // Enter jumps to the first available result.
  const onKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const first =
      results.vendors[0] ? `/vendors/${results.vendors[0].id}` :
      results.rfqs[0] ? `/rfqs/${results.rfqs[0].id}` :
      results.invoices[0] ? `/invoices/${results.invoices[0].id}` : null;
    if (first) go(first);
  };

  return (
    <div ref={boxRef} className="relative flex-1 max-w-xl mx-4">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={q}
        onFocusCapture={ensureLoaded}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder="Search vendors, RFQs, invoices..."
        className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
      />

      {open && term.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-5 text-sm text-slate-400">
              <Loader2 size={15} className="animate-spin" /> Loading…
            </div>
          ) : total === 0 ? (
            <p className="px-4 py-5 text-sm text-slate-400">No matches for “{q}”.</p>
          ) : (
            <>
              <Group title="Vendors" icon={Users} rows={results.vendors}
                render={(v) => ({ key: v.id, primary: v.name, secondary: `${v.id} · ${v.category}`, href: `/vendors/${v.id}` })} onGo={go} />
              <Group title="RFQs" icon={FileText} rows={results.rfqs}
                render={(r) => ({ key: r.id, primary: r.title, secondary: `${r.id} · ${r.status}`, href: `/rfqs/${r.id}` })} onGo={go} />
              <Group title="Invoices" icon={Receipt} rows={results.invoices}
                render={(i) => ({ key: i.id, primary: i.vendor, secondary: `${i.id} · ${formatINR(i.amount)}`, href: `/invoices/${i.id}` })} onGo={go} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, icon: Icon, rows, render, onGo }) {
  if (!rows.length) return null;
  return (
    <div className="py-1.5">
      <p className="px-4 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      {rows.map((row) => {
        const r = render(row);
        return (
          <button
            key={r.key}
            onClick={() => onGo(r.href)}
            className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-slate-50 transition"
          >
            <Icon size={15} className="text-slate-400 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-800 truncate">{r.primary}</span>
              <span className="block text-xs text-slate-400 truncate">{r.secondary}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
