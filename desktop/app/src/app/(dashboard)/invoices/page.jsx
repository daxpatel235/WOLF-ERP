"use client";

import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { invoicesApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate } from "@/lib/format";
import { PageHeader, Badge, PrimaryButton } from "@/components/ui/kit";
import { DataTable } from "@/components/ui/DataTable";

const STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"];

export default function InvoicesPage() {
  const { data, loading, error, refetch } = useFetch(() => invoicesApi.list(), [], {
    key: "invoices",
  });
  const rows = data?.data || [];

  const outstanding = rows
    .filter((i) => !["Paid", "Cancelled"].includes(i.status))
    .reduce((s, i) => s + (i.amount - (i.amountPaid || 0)), 0);

  const columns = [
    {
      key: "id",
      label: "Invoice",
      sortable: true,
      render: (iv) => (
        <span>
          <span className="block font-semibold text-fg">{iv.id}</span>
          <span className="block text-xs text-fg-muted">{iv.poId}</span>
        </span>
      ),
    },
    { key: "vendor", label: "Vendor", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      align: "right",
      render: (iv) => (
        <span className="font-semibold text-fg tabular-nums">{formatINR(iv.amount)}</span>
      ),
      exportValue: (iv) => iv.amount ?? 0,
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      align: "right",
      // Derived, so it needs an explicit sort/export value — there's no
      // `balance` field on the record itself.
      sortValue: (iv) => (iv.amount || 0) - (iv.amountPaid || 0),
      exportValue: (iv) => (iv.amount || 0) - (iv.amountPaid || 0),
      render: (iv) => {
        const bal = (iv.amount || 0) - (iv.amountPaid || 0);
        return (
          <span
            className={`tabular-nums font-medium ${
              bal > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {formatINR(bal)}
          </span>
        );
      },
    },
    {
      key: "issued",
      label: "Issued",
      sortable: true,
      render: (iv) => <span className="text-fg-muted">{formatDate(iv.issued)}</span>,
    },
    {
      key: "due",
      label: "Due",
      sortable: true,
      render: (iv) => <span className="text-fg-muted">{formatDate(iv.due)}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filter: STATUSES,
      render: (iv) => <Badge status={iv.status} />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Invoices"
        subtitle={`${formatINR(outstanding)} outstanding across ${rows.length} invoices`}
      >
        <Link href="/invoices/new">
          <PrimaryButton>
            <Plus size={16} /> Create invoice
          </PrimaryButton>
        </Link>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={refetch}
        rowHref={(iv) => `/invoices/${iv.id}`}
        searchPlaceholder="Search invoice or vendor…"
        searchKeys={["id", "vendor", "poId", "status"]}
        exportName="invoices"
        title="Wolf ERP — Invoices"
        emptyIcon={Receipt}
        emptyTitle="No invoices yet"
        emptyHint="Raise one against a received purchase order."
      />
    </div>
  );
}
