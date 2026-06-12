"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, FileText, Calendar, Users, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { rfqsApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, SearchBar, FilterTabs, PrimaryButton, EmptyState } from "@/components/ui/kit";

const TABS = ["All", "Draft", "Published", "Closed", "Awarded"];

export default function RfqsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const { data, loading, error } = useFetch(() => rfqsApi.list(), []);
  const ALL = data?.data || [];

  const rows = useMemo(
    () =>
      ALL.filter((r) => {
        const matchTab = tab === "All" || r.status === tab;
        const q = query.trim().toLowerCase();
        const matchQ = !q || (r.title || "").toLowerCase().includes(q) || (r.id || "").toLowerCase().includes(q);
        return matchTab && matchQ;
      }),
    [ALL, query, tab]
  );

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="RFQs" subtitle="Requests for quotation sent to your vendors">
        <Link href="/rfqs/new">
          <PrimaryButton>
            <Plus size={16} /> Create RFQ
          </PrimaryButton>
        </Link>
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <SearchBar value={query} onChange={setQuery} placeholder="Search RFQ title or ID..." />
        <FilterTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {loading ? (
        <Card><div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 size={18} className="animate-spin" /> Loading RFQs...</div></Card>
      ) : error ? (
        <Card><EmptyState icon={AlertCircle} title="Couldn't load RFQs" hint={error.message} /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No RFQs found" hint="Create one to start collecting quotes." /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Link key={r.id} href={`/rfqs/${r.id}`} className="group">
              <Card className="p-5 h-full hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">{r.id}</span>
                  <Badge status={r.status} />
                </div>
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 leading-snug">{r.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{r.category}</p>

                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Calendar size={13} /> Due {formatDate(r.due)}</span>
                  <span className="inline-flex items-center gap-1"><Users size={13} /> {r.invited} invited</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm">
                    <span className="font-bold text-slate-900">{r.received}</span>
                    <span className="text-slate-400"> / {r.invited} quotes</span>
                  </span>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
