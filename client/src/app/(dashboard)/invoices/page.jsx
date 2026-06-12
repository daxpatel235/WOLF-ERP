"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Receipt, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { invoicesApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, SearchBar, FilterTabs, PrimaryButton, EmptyState } from "@/components/ui/kit";

const TABS = ["All", "Draft", "Sent", "Partially Paid", "Paid", "Overdue"];

export default function InvoicesPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const { data, loading, error } = useFetch(() => invoicesApi.list(), []);
  const ALL = data?.data || [];

  const rows = useMemo(
    () =>
      ALL.filter((iv) => {
        const matchTab = tab === "All" || iv.status === tab;
        const s = query.trim().toLowerCase();
        const matchQ = !s || (iv.vendor || "").toLowerCase().includes(s) || (iv.id || "").toLowerCase().includes(s);
        return matchTab && matchQ;
      }),
    [ALL, query, tab]
  );

  const outstanding = ALL.filter((i) => !["Paid", "Cancelled"].includes(i.status)).reduce((s, i) => s + (i.amount - (i.amountPaid || 0)), 0);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Invoices" subtitle={`${formatINR(outstanding)} outstanding across ${ALL.length} invoices`}>
        <Link href="/invoices/new">
          <PrimaryButton>
            <Plus size={16} /> Create invoice
          </PrimaryButton>
        </Link>
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <SearchBar value={query} onChange={setQuery} placeholder="Search invoice or vendor..." />
        <FilterTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 size={18} className="animate-spin" /> Loading invoices...</div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Couldn't load invoices" hint={error.message} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">Invoice</th>
                  <th className="px-6 py-3.5">Vendor</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Issued</th>
                  <th className="px-6 py-3.5">Due</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((iv) => (
                  <tr key={iv.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <Link href={`/invoices/${iv.id}`} className="font-semibold text-slate-900 hover:text-blue-600">{iv.id}</Link>
                      <p className="text-xs text-slate-400">{iv.poId}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{iv.vendor}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatINR(iv.amount)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(iv.issued)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(iv.due)}</td>
                    <td className="px-6 py-4"><Badge status={iv.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/invoices/${iv.id}`} className="text-slate-400 hover:text-blue-600"><ChevronRight size={18} /></Link>
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
