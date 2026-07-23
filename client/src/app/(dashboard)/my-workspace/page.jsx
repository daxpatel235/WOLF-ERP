"use client";

// "What needs me" — the personal counterpart to the org-wide dashboard.
// Everything here is scoped to the signed-in user: their approvals queue, the
// records they raised, and what's falling due. All derived client-side from
// existing list endpoints, so it needs no new API.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, FileText, ShoppingCart, Receipt, ArrowRight, Inbox,
  CalendarDays, AlertTriangle, Clock, LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import { approvalsApi, rfqsApi, purchaseOrdersApi, invoicesApi } from "@/lib/api";
import { formatINR, formatDate, priorityClass, cn } from "@/lib/format";
import { PageHeader, Card, Badge, EmptyState, ViewToggle } from "@/components/ui/kit";
import { StatCard } from "@/components/ui/StatCard";
import { Calendar } from "@/components/ui/Calendar";
import { CardSkeleton } from "@/components/ui/feedback";

const DAY = 86_400_000;
const daysUntil = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / DAY);

// Does this record belong to the signed-in user? The API exposes creator as a
// display name on some models and an id on others, so check both.
function isMine(record, user) {
  if (!user) return false;
  const mine = [user.id, user._id, user.name, user.email].filter(Boolean).map(String);
  return [record.createdBy, record.requestedBy, record.owner, record.raisedBy]
    .filter(Boolean)
    .some((v) => mine.includes(String(v)));
}

function SectionCard({ title, icon: Icon, count, action, children }) {
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={16} className="text-fg-muted shrink-0" />
          <h3 className="font-semibold text-fg truncate">{title}</h3>
          {typeof count === "number" && (
            <span className="rounded-full bg-surface-2 text-fg-muted px-2 py-0.5 text-xs font-semibold tabular-nums shrink-0">
              {count}
            </span>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 shrink-0"
          >
            {action.label} <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

const VIEWS = [
  { key: "summary", label: "Summary", icon: LayoutGrid },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
];

export default function MyWorkspacePage() {
  const { user } = useAuth();
  const [view, setView] = useState("summary");

  const { data: approvalsRes, loading: loadingApprovals } = useFetch(
    () => approvalsApi.list({ status: "Pending" }), [], { key: "approvals:pending" }
  );
  const { data: rfqRes, loading: loadingRfqs } = useFetch(
    () => rfqsApi.list(), [], { key: "rfqs" }
  );
  const { data: poRes, loading: loadingPos } = useFetch(
    () => purchaseOrdersApi.list(), [], { key: "purchase-orders" }
  );
  const { data: invRes, loading: loadingInvoices } = useFetch(
    () => invoicesApi.list(), [], { key: "invoices" }
  );

  const pendingApprovals = approvalsRes?.pending || [];
  const rfqs = rfqRes?.data || [];
  const pos = poRes?.data || [];
  const invoices = invRes?.data || [];

  const myRfqs = useMemo(
    () => rfqs.filter((r) => isMine(r, user)).slice(0, 5),
    [rfqs, user]
  );
  const myPos = useMemo(
    () => pos.filter((p) => isMine(p, user)).slice(0, 5),
    [pos, user]
  );

  // Deliveries arriving and invoices falling due inside the next fortnight.
  const upcoming = useMemo(() => {
    const items = [];
    pos.forEach((p) => {
      if (!p.delivery || ["Received", "Cancelled"].includes(p.status)) return;
      const d = daysUntil(p.delivery);
      if (d >= -7 && d <= 14) {
        items.push({ id: `po-${p.id}`, kind: "Delivery", label: p.id, sub: p.vendor, date: p.delivery, days: d, href: `/purchase-orders/${p.id}` });
      }
    });
    invoices.forEach((iv) => {
      if (!iv.due || ["Paid", "Cancelled"].includes(iv.status)) return;
      const d = daysUntil(iv.due);
      if (d >= -30 && d <= 14) {
        items.push({ id: `inv-${iv.id}`, kind: "Invoice due", label: iv.id, sub: iv.vendor, date: iv.due, days: d, href: `/invoices/${iv.id}` });
      }
    });
    return items.sort((a, b) => a.days - b.days);
  }, [pos, invoices]);

  const overdue = upcoming.filter((u) => u.days < 0);

  // Calendar events: PO deliveries + invoice due dates on one month grid.
  const calendarEvents = useMemo(
    () => [
      ...pos
        .filter((p) => p.delivery && p.status !== "Cancelled")
        .map((p) => ({ id: `po-${p.id}`, date: p.delivery, kind: "po", label: p.id, href: `/purchase-orders/${p.id}` })),
      ...invoices
        .filter((iv) => iv.due && iv.status !== "Cancelled")
        .map((iv) => ({ id: `inv-${iv.id}`, date: iv.due, kind: "invoice", label: iv.id, overdue: iv.status === "Overdue", href: `/invoices/${iv.id}` })),
    ],
    [pos, invoices]
  );

  const loading = loadingApprovals || loadingRfqs || loadingPos || loadingInvoices;
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={`Your workspace, ${firstName}`}
        subtitle="Everything waiting on you, in one place."
      >
        <ViewToggle views={VIEWS} active={view} onChange={setView} />
      </PageHeader>

      {/* ---- Personal stats ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatCard
          label="Awaiting your sign-off"
          value={pendingApprovals.length}
          icon={CheckCircle2}
          tone="violet"
          loading={loadingApprovals}
        />
        <StatCard
          label="RFQs you raised"
          value={myRfqs.length}
          icon={FileText}
          tone="blue"
          loading={loadingRfqs}
        />
        <StatCard
          label="POs you raised"
          value={myPos.length}
          icon={ShoppingCart}
          tone="sky"
          loading={loadingPos}
        />
        <StatCard
          label="Overdue items"
          value={overdue.length}
          icon={AlertTriangle}
          tone={overdue.length ? "red" : "emerald"}
          hint={overdue.length ? "Needs attention" : "Nothing overdue"}
          loading={loading}
        />
      </div>

      {view === "calendar" ? (
        <Card className="p-5">
          <Calendar
            events={calendarEvents}
            dateKey="date"
            render={(e) => e.label}
            tone={(e) =>
              e.kind === "po"
                ? "bg-blue-500/10 text-brand hover:bg-blue-500/20"
                : e.overdue
                ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
            }
            onEventClick={(e) => {
              window.location.href = e.href;
            }}
          />
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> PO delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Invoice due
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Overdue
            </span>
          </div>
        </Card>
      ) : loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Approvals queue */}
          <SectionCard
            title="Awaiting your sign-off"
            icon={CheckCircle2}
            count={pendingApprovals.length}
            action={{ href: "/approvals", label: "All approvals" }}
          >
            {pendingApprovals.length === 0 ? (
              <EmptyState icon={Inbox} title="All caught up" hint="Nothing needs your decision." />
            ) : (
              <div className="space-y-2">
                {pendingApprovals.slice(0, 4).map((a) => (
                  <Link
                    key={a.id}
                    href="/approvals"
                    className="block p-3 rounded-xl border border-border hover:border-brand/40 hover:bg-surface-2/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-fg">{a.refId}</span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${priorityClass(a.priority)}`}
                      >
                        {a.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-fg-muted truncate">{a.vendor}</span>
                      {a.amount > 0 && (
                        <span className="text-sm font-bold text-fg tabular-nums">
                          {formatINR(a.amount)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Due soon */}
          <SectionCard
            title="Due in the next 2 weeks"
            icon={Clock}
            count={upcoming.length}
          >
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing due" hint="No deliveries or payments coming up." />
            ) : (
              <div className="space-y-1">
                {upcoming.slice(0, 6).map((u) => (
                  <Link
                    key={u.id}
                    href={u.href}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition"
                  >
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                        u.kind === "Delivery"
                          ? "bg-blue-500/10 text-brand"
                          : "bg-amber-500/10 text-amber-600"
                      )}
                    >
                      {u.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg truncate">{u.label}</span>
                      <span className="block text-xs text-fg-muted truncate">{u.sub}</span>
                    </span>
                    <span
                      className={cn(
                        "text-xs whitespace-nowrap shrink-0",
                        u.days < 0 ? "text-red-600 font-semibold" : "text-fg-muted"
                      )}
                    >
                      {u.days < 0
                        ? `${Math.abs(u.days)}d overdue`
                        : u.days === 0
                        ? "Today"
                        : `in ${u.days}d`}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* My RFQs */}
          <SectionCard
            title="RFQs you raised"
            icon={FileText}
            count={myRfqs.length}
            action={{ href: "/rfqs", label: "All RFQs" }}
          >
            {myRfqs.length === 0 ? (
              <EmptyState icon={FileText} title="No RFQs yet" hint="Create one to start collecting quotes." />
            ) : (
              <div className="space-y-1">
                {myRfqs.map((r) => (
                  <Link
                    key={r.id}
                    href={`/rfqs/${r.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg truncate">{r.title}</span>
                      <span className="block text-xs text-fg-muted">
                        {r.id} · {r.received}/{r.invited} quotes
                      </span>
                    </span>
                    <Badge status={r.status} />
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* My POs */}
          <SectionCard
            title="POs you raised"
            icon={ShoppingCart}
            count={myPos.length}
            action={{ href: "/purchase-orders", label: "All POs" }}
          >
            {myPos.length === 0 ? (
              <EmptyState icon={Receipt} title="No purchase orders yet" hint="Award a quotation to draft one." />
            ) : (
              <div className="space-y-1">
                {myPos.map((p) => (
                  <Link
                    key={p.id}
                    href={`/purchase-orders/${p.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg truncate">{p.id}</span>
                      <span className="block text-xs text-fg-muted truncate">
                        {p.vendor} · {formatDate(p.delivery)}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-fg tabular-nums shrink-0">
                      {formatINR(p.amount)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
