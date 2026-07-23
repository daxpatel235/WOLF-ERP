"use client";

import Link from "next/link";
import { Plus, Star, Users } from "lucide-react";
import { useVendors } from "@/hooks/useVendors";
import { formatINR } from "@/lib/format";
import { PageHeader, Badge, PrimaryButton } from "@/components/ui/kit";
import { DataTable } from "@/components/ui/DataTable";

const STATUSES = ["Active", "Pending", "Inactive"];

export default function VendorsPage() {
  const { vendors, loading, error } = useVendors();

  // `exportValue` gives the exporters the raw figure behind a rendered cell,
  // so a CSV carries 250000 rather than "₹2,50,000".
  const columns = [
    {
      key: "name",
      label: "Vendor",
      sortable: true,
      render: (v) => (
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-semibold text-xs shrink-0">
            {(v.name || "").split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-fg truncate">{v.name}</span>
            <span className="block text-xs text-fg-muted truncate">
              {v.id} · {v.location}
            </span>
          </span>
        </span>
      ),
    },
    { key: "category", label: "Category", sortable: true, filter: [] },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-fg font-medium tabular-nums">
          <Star size={14} className="text-amber-400 fill-amber-400" /> {v.rating}
        </span>
      ),
    },
    { key: "orders", label: "Orders", sortable: true },
    {
      key: "spend",
      label: "Total Spend",
      sortable: true,
      align: "right",
      render: (v) => (
        <span className="font-semibold text-fg tabular-nums">{formatINR(v.spend)}</span>
      ),
      exportValue: (v) => v.spend ?? 0,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filter: STATUSES,
      render: (v) => <Badge status={v.status} />,
    },
  ];

  // Populate the category filter from the data itself, so it always matches
  // what's actually in the workspace.
  columns[1].filter = [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort();

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Vendors" subtitle={`${vendors.length} suppliers in your network`}>
        <Link href="/vendors/new">
          <PrimaryButton>
            <Plus size={16} /> Add Vendor
          </PrimaryButton>
        </Link>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={vendors}
        loading={loading}
        error={error}
        rowHref={(v) => `/vendors/${v.id}`}
        searchPlaceholder="Search vendors, category, contact…"
        searchKeys={["name", "category", "contact", "email", "id", "location"]}
        exportName="vendors"
        title="Wolf ERP — Vendors"
        emptyIcon={Users}
        emptyTitle="No vendors yet"
        emptyHint="Add your first supplier to start raising RFQs."
      />
    </div>
  );
}
