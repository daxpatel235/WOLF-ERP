"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, FileText, Calendar, Users, ChevronRight, Loader2, AlertCircle,
  LayoutGrid, List, Columns3,
} from "lucide-react";
import { rfqsApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, PrimaryButton, EmptyState, ViewToggle } from "@/components/ui/kit";
import { DataTable } from "@/components/ui/DataTable";
import { Kanban } from "@/components/ui/Kanban";
import { CardSkeleton } from "@/components/ui/feedback";

const STATUSES = ["Draft", "Published", "Closed", "Awarded"];

const VIEWS = [
  { key: "cards", label: "Cards", icon: LayoutGrid },
  { key: "table", label: "Table", icon: List },
  { key: "board", label: "Board", icon: Columns3 },
];

// The RFQ lifecycle, left to right.
const BOARD_COLUMNS = [
  { key: "Draft", label: "Draft" },
  { key: "Published", label: "Published", color: "bg-blue-400" },
  { key: "Closed", label: "Closed", color: "bg-amber-400" },
  { key: "Awarded", label: "Awarded", color: "bg-emerald-400" },
];

export default function RfqsPage() {
  const { data, loading, error, refetch } = useFetch(() => rfqsApi.list(), [], { key: "rfqs" });
  const rows = data?.data || [];
  const [view, setView] = useState("cards");

  const columns = [
    {
      key: "id",
      label: "RFQ",
      sortable: true,
      render: (r) => (
        <span>
          <span className="block font-semibold text-fg">{r.id}</span>
          <span className="block text-xs text-fg-muted truncate max-w-[220px]">{r.title}</span>
        </span>
      ),
    },
    { key: "category", label: "Category", sortable: true },
    {
      key: "due",
      label: "Due",
      sortable: true,
      render: (r) => <span className="text-fg-muted">{formatDate(r.due)}</span>,
    },
    {
      key: "invited",
      label: "Invited",
      sortable: true,
      align: "right",
      render: (r) => <span className="tabular-nums text-fg-muted">{r.invited}</span>,
    },
    {
      key: "received",
      label: "Quotes",
      sortable: true,
      align: "right",
      render: (r) => (
        <span className="tabular-nums">
          <span className="font-semibold text-fg">{r.received}</span>
          <span className="text-fg-muted"> / {r.invited}</span>
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filter: STATUSES,
      render: (r) => <Badge status={r.status} />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="RFQs" subtitle="Requests for quotation sent to your vendors">
        <ViewToggle views={VIEWS} active={view} onChange={setView} />
        <Link href="/rfqs/new">
          <PrimaryButton>
            <Plus size={16} /> Create RFQ
          </PrimaryButton>
        </Link>
      </PageHeader>

      {view === "table" && (
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={refetch}
          rowHref={(r) => `/rfqs/${r.id}`}
          searchPlaceholder="Search RFQ title or ID…"
          searchKeys={["id", "title", "category", "status"]}
          exportName="rfqs"
          title="Wolf ERP — RFQs"
          emptyIcon={FileText}
          emptyTitle="No RFQs yet"
          emptyHint="Create one to start collecting quotes."
        />
      )}

      {view === "board" && (
        <Kanban
          columns={BOARD_COLUMNS}
          items={rows}
          groupBy="status"
          loading={loading}
          cardHref={(r) => `/rfqs/${r.id}`}
          renderCard={(r) => (
            <>
              <span className="text-[11px] font-semibold text-fg-muted">{r.id}</span>
              <p className="font-semibold text-sm text-fg leading-snug mt-0.5">{r.title}</p>
              <div className="flex items-center justify-between mt-2 text-xs text-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(r.due)}
                </span>
                <span className="tabular-nums">
                  {r.received}/{r.invited} quotes
                </span>
              </div>
            </>
          )}
        />
      )}

      {view === "cards" && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <Card>
              <EmptyState icon={AlertCircle} title="Couldn't load RFQs" hint={error.message} />
            </Card>
          ) : rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={FileText}
                title="No RFQs yet"
                hint="Create one to start collecting quotes."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
              {rows.map((r) => (
                <Link key={r.id} href={`/rfqs/${r.id}`} className="group">
                  <Card className="p-5 h-full shadow-card hover:shadow-card-hover hover:border-brand/40 hover:-translate-y-0.5 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-semibold text-fg-muted">{r.id}</span>
                      <Badge status={r.status} />
                    </div>
                    <h3 className="font-semibold text-fg group-hover:text-brand leading-snug">
                      {r.title}
                    </h3>
                    <p className="text-xs text-fg-muted mt-1">{r.category}</p>

                    <div className="flex items-center gap-4 mt-4 text-xs text-fg-muted">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={13} /> Due {formatDate(r.due)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} /> {r.invited} invited
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-sm tabular-nums">
                        <span className="font-bold text-fg">{r.received}</span>
                        <span className="text-fg-muted"> / {r.invited} quotes</span>
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-fg-muted group-hover:text-brand transition"
                      />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
