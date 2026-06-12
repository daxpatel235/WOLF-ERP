"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FileSpreadsheet, GitCompare, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { quotationsApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, SearchBar, FilterTabs, GhostButton, EmptyState } from "@/components/ui/kit";

const TABS = ["All", "Received", "Shortlisted", "Awarded", "Rejected"];

export default function QuotationsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const { data, loading, error } = useFetch(() => quotationsApi.list(), []);
  const ALL = data?.data || [];

  const rows = useMemo(
    () =>
      ALL.filter((q) => {
        const matchTab = tab === "All" || q.status === tab;
        const s = query.trim().toLowerCase();
        const matchQ = !s || (q.vendor || "").toLowerCase().includes(s) || (q.rfqTitle || "").toLowerCase().includes(s) || (q.id || "").toLowerCase().includes(s);
        return matchTab && matchQ;
      }),
    [ALL, query, tab]
  );

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Quotations" subtitle="Vendor responses to your RFQs">
        <GhostButton href="/quotations/compare">
          <GitCompare size={16} /> Compare
        </GhostButton>
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <SearchBar value={query} onChange={setQuery} placeholder="Search vendor, RFQ or quote ID..." />
        <FilterTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 size={18} className="animate-spin" /> Loading quotations...</div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Couldn't load quotations" hint={error.message} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="No quotations found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">Quote</th>
                  <th className="px-6 py-3.5">Vendor</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Delivery</th>
                  <th className="px-6 py-3.5">Submitted</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <Link href={`/quotations/${q.id}`} className="font-semibold text-slate-900 hover:text-blue-600">{q.id}</Link>
                      <p className="text-xs text-slate-400 truncate max-w-[180px]">{q.rfqTitle}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{q.vendor}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatINR(q.amount)}</td>
                    <td className="px-6 py-4 text-slate-600">{q.deliveryDays} days</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(q.submitted)}</td>
                    <td className="px-6 py-4"><Badge status={q.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/quotations/${q.id}`} className="text-slate-400 hover:text-blue-600"><ChevronRight size={18} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
