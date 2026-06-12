"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, ShoppingCart, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { purchaseOrdersApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate, priorityClass } from "@/lib/format";
import { PageHeader, Card, Badge, SearchBar, FilterTabs, PrimaryButton, EmptyState } from "@/components/ui/kit";

const TABS = ["All", "Draft", "Pending Approval", "Approved", "Sent", "Received"];

export default function PurchaseOrdersPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const { data, loading, error } = useFetch(() => purchaseOrdersApi.list(), []);
  const ALL = data?.data || [];

  const rows = useMemo(
    () =>
      ALL.filter((p) => {
        const matchTab = tab === "All" || p.status === tab;
        const s = query.trim().toLowerCase();
        const matchQ = !s || (p.vendor || "").toLowerCase().includes(s) || (p.id || "").toLowerCase().includes(s);
        return matchTab && matchQ;
      }),
    [ALL, query, tab]
  );

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Purchase Orders" subtitle="Track and manage your POs end-to-end">
        <Link href="/purchase-orders/new">
          <PrimaryButton>
            <Plus size={16} /> New PO
          </PrimaryButton>
        </Link>
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <SearchBar value={query} onChange={setQuery} placeholder="Search PO or vendor..." />
        <FilterTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 size={18} className="animate-spin" /> Loading purchase orders...</div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Couldn't load purchase orders" hint={error.message} />
        ) : rows.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No purchase orders found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">PO</th>
                  <th className="px-6 py-3.5">Vendor</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Delivery</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <Link href={`/purchase-orders/${p.id}`} className="font-semibold text-slate-900 hover:text-blue-600">{p.id}</Link>
                      <p className="text-xs text-slate-400">{formatDate(p.created)}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{p.vendor}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatINR(p.amount)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(p.delivery)}</td>
                    <td className="px-6 py-4"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityClass(p.priority)}`}>{p.priority}</span></td>
                    <td className="px-6 py-4"><Badge status={p.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/purchase-orders/${p.id}`} className="text-slate-400 hover:text-blue-600"><ChevronRight size={18} /></Link>
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
