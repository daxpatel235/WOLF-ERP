"use client";

import Link from "next/link";
import { Plus, ShoppingCart, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { purchaseOrdersApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate, priorityClass } from "@/lib/format";
import { PageHeader, Badge, PrimaryButton, ViewToggle } from "@/components/ui/kit";
import { DataTable } from "@/components/ui/DataTable";
import { Kanban } from "@/components/ui/Kanban";
import { useToast } from "@/components/ui/Toast";

const VIEWS = [
  { key: "list", label: "List", icon: List },
  { key: "board", label: "Board", icon: LayoutGrid },
];

const STATUSES = ["Draft", "Pending Approval", "Approved", "Sent", "Received", "Cancelled"];

// Board columns: the PO lifecycle, left to right. Cancelled is deliberately
// omitted — it's an exit, not a stage, and would just clutter the pipeline.
const BOARD_COLUMNS = [
  { key: "Draft", label: "Draft" },
  { key: "Pending Approval", label: "Pending Approval", color: "bg-amber-400" },
  { key: "Approved", label: "Approved", color: "bg-blue-400" },
  { key: "Sent", label: "Sent", color: "bg-violet-400" },
  { key: "Received", label: "Received", color: "bg-emerald-400" },
];

export default function PurchaseOrdersPage() {
  const { data, loading, error, refetch, setData } = useFetch(
    () => purchaseOrdersApi.list(),
    [],
    { key: "purchase-orders" }
  );
  const rows = data?.data || [];
  const [view, setView] = useState("list");
  const toast = useToast();

  const columns = [
    {
      key: "id",
      label: "PO",
      sortable: true,
      render: (p) => (
        <span>
          <span className="block font-semibold text-fg">{p.id}</span>
          <span className="block text-xs text-fg-muted">{formatDate(p.created)}</span>
        </span>
      ),
    },
    { key: "vendor", label: "Vendor", sortable: true },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      align: "right",
      render: (p) => (
        <span className="font-semibold text-fg tabular-nums">{formatINR(p.amount)}</span>
      ),
      exportValue: (p) => p.amount ?? 0,
    },
    {
      key: "delivery",
      label: "Delivery",
      sortable: true,
      render: (p) => <span className="text-fg-muted">{formatDate(p.delivery)}</span>,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      filter: ["high", "medium", "low"],
      render: (p) => (
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityClass(
            p.priority
          )}`}
        >
          {p.priority}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filter: STATUSES,
      render: (p) => <Badge status={p.status} />,
    },
  ];

  // Dragging a card writes the new status straight through, with an optimistic
  // update so the card lands where you dropped it instead of snapping back.
  const moveStatus = async (row, next) => {
    if (row.status === next) return;
    const previous = data;
    setData({
      ...data,
      data: rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)),
    });
    try {
      await purchaseOrdersApi.setStatus(row.id, next);
      toast.success(`${row.id} moved to ${next}.`);
      refetch();
    } catch (e) {
      setData(previous); // roll back — the server refused the transition
      toast.error(e.message || `Could not move ${row.id}.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Purchase Orders" subtitle="Track and manage your POs end-to-end">
        <ViewToggle views={VIEWS} active={view} onChange={setView} />
        <Link href="/purchase-orders/new">
          <PrimaryButton>
            <Plus size={16} /> New PO
          </PrimaryButton>
        </Link>
      </PageHeader>

      {view === "list" ? (
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={refetch}
          rowHref={(p) => `/purchase-orders/${p.id}`}
          searchPlaceholder="Search PO or vendor…"
          searchKeys={["id", "vendor", "status", "rfqId"]}
          exportName="purchase-orders"
          title="Wolf ERP — Purchase Orders"
          emptyIcon={ShoppingCart}
          emptyTitle="No purchase orders yet"
          emptyHint="Award a quotation or raise a PO directly."
        />
      ) : (
        <Kanban
          columns={BOARD_COLUMNS}
          items={rows}
          groupBy="status"
          loading={loading}
          onMove={moveStatus}
          cardHref={(p) => `/purchase-orders/${p.id}`}
          renderCard={(p) => (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-sm text-fg">{p.id}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${priorityClass(
                    p.priority
                  )}`}
                >
                  {p.priority}
                </span>
              </div>
              <p className="text-xs text-fg-muted mt-1 truncate">{p.vendor}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold text-fg tabular-nums">
                  {formatINR(p.amount)}
                </span>
                <span className="text-[11px] text-fg-muted">{formatDate(p.delivery)}</span>
              </div>
            </>
          )}
        />
      )}
    </div>
  );
}
