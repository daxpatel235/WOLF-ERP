"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Download, Star, ChevronRight, Users, Loader2, AlertCircle } from "lucide-react";
import { useVendors } from "@/hooks/useVendors";
import { formatINR } from "@/lib/format";
import { saveFile } from "@/lib/utils";
import { PageHeader, Card, Badge, SearchBar, FilterTabs, PrimaryButton, GhostButton, EmptyState } from "@/components/ui/kit";

const TABS = ["All", "Active", "Pending", "Inactive"];

export default function VendorsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All");
  const { vendors, loading, error } = useVendors();

  const rows = useMemo(() => {
    return vendors.filter((v) => {
      const matchTab = tab === "All" || v.status === tab;
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        (v.name || "").toLowerCase().includes(q) ||
        (v.category || "").toLowerCase().includes(q) ||
        (v.contact || "").toLowerCase().includes(q);
      return matchTab && matchQ;
    });
  }, [vendors, query, tab]);

  const exportCsv = () => {
    const header = "ID,Name,Category,Contact,Email,Status,Orders,Spend\n";
    const body = rows
      .map((v) => [v.id, v.name, v.category, v.contact, v.email, v.status, v.orders, v.spend].map((c) => `"${c ?? ""}"`).join(","))
      .join("\n");
    // Opens a "Save As" dialog (Chrome/Edge) so you choose where to save it.
    saveFile("vendors.csv", header + body, "text/csv");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Vendors" subtitle={`${vendors.length} suppliers in your network`}>
        <GhostButton onClick={exportCsv}>
          <Download size={16} /> Export
        </GhostButton>
        <Link href="/vendors/new">
          <PrimaryButton>
            <Plus size={16} /> Add Vendor
          </PrimaryButton>
        </Link>
      </PageHeader>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <SearchBar value={query} onChange={setQuery} placeholder="Search vendors, category, contact..." />
        <FilterTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Loading vendors...
          </div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Couldn't load vendors" hint={error.message} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No vendors found" hint="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">Vendor</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Rating</th>
                  <th className="px-6 py-3.5">Orders</th>
                  <th className="px-6 py-3.5">Total Spend</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <Link href={`/vendors/${v.id}`} className="flex items-center gap-3 group">
                        <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-semibold text-xs">
                          {v.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </span>
                        <span>
                          <span className="block font-semibold text-slate-900 group-hover:text-blue-600">{v.name}</span>
                          <span className="block text-xs text-slate-400">{v.id} · {v.location}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{v.category}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                        <Star size={14} className="text-amber-400 fill-amber-400" /> {v.rating}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{v.orders}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatINR(v.spend)}</td>
                    <td className="px-6 py-4"><Badge status={v.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/vendors/${v.id}`} className="text-slate-400 hover:text-blue-600">
                        <ChevronRight size={18} />
                      </Link>
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
