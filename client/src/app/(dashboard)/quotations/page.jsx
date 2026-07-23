"use client";

import { FileSpreadsheet, GitCompare } from "lucide-react";
import { quotationsApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate } from "@/lib/format";
import { PageHeader, Badge, GhostButton } from "@/components/ui/kit";
import { DataTable } from "@/components/ui/DataTable";

const STATUSES = ["Received", "Shortlisted", "Awarded", "Rejected"];

export default function QuotationsPage() {
  const { data, loading, error, refetch } = useFetch(() => quotationsApi.list(), [], {
    key: "quotations",
  });
  const rows = data?.data || [];

  const columns = [
    {
      key: "id",
      label: "Quote",
      sortable: true,
      render: (q) => (
        <span>
          <span className="block font-semibold text-fg">{q.id}</span>
          <span className="block text-xs text-fg-muted truncate max-w-[180px]">
            {q.rfqTitle}
          </span>
        </span>
      ),
    },
    { key: "vendor", label: "Vendor", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      align: "right",
      render: (q) => (
        <span className="font-semibold text-fg tabular-nums">{formatINR(q.amount)}</span>
      ),
      exportValue: (q) => q.amount ?? 0,
    },
    {
      key: "deliveryDays",
      label: "Delivery",
      sortable: true,
      render: (q) => <span className="text-fg-muted tabular-nums">{q.deliveryDays} days</span>,
      exportValue: (q) => q.deliveryDays ?? "",
    },
    {
      key: "submitted",
      label: "Submitted",
      sortable: true,
      render: (q) => <span className="text-fg-muted">{formatDate(q.submitted)}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filter: STATUSES,
      render: (q) => <Badge status={q.status} />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Quotations" subtitle="Vendor responses to your RFQs">
        <GhostButton href="/quotations/compare">
          <GitCompare size={16} /> Compare
        </GhostButton>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={refetch}
        rowHref={(q) => `/quotations/${q.id}`}
        searchPlaceholder="Search vendor, RFQ or quote ID…"
        searchKeys={["id", "vendor", "rfqTitle", "rfqId", "status"]}
        exportName="quotations"
        title="Wolf ERP — Quotations"
        emptyIcon={FileSpreadsheet}
        emptyTitle="No quotations yet"
        emptyHint="Publish an RFQ and invite vendors to quote."
      />
    </div>
  );
}
