"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  CheckCircle2,
  Receipt,
  ArrowUpRight,
  Plus,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import { reportsApi, approvalsApi, purchaseOrdersApi } from "@/lib/api";
import { formatINR, formatCompactINR } from "@/lib/format";
import { toTimelineItems } from "@/lib/activity";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard, AreaChartX, PieChartX } from "@/components/ui/Chart";
import { Timeline } from "@/components/ui/Timeline";

const quickActions = [
  { label: "Add Vendor", href: "/vendors/new", icon: Users },
  { label: "Create RFQ", href: "/rfqs/new", icon: FileText },
  { label: "New PO", href: "/purchase-orders/new", icon: ShoppingCart },
  { label: "Generate Invoice", href: "/invoices/new", icon: Receipt },
];

// Statuses whose POs count as committed spend — mirrors the server's SPENDABLE.
const SPENDABLE = ["Approved", "Sent", "Received"];

// Roll POs into the last `months` calendar buckets, so the trend always spans a
// fixed window — including the months with no orders at all.
function monthlySpend(pos, months = 6) {
  const buckets = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      amount: 0,
      orders: 0,
    });
  }
  const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]));

  pos.forEach((p) => {
    if (!SPENDABLE.includes(p.status)) return;
    const d = new Date(p.created || p.createdAt);
    if (isNaN(d)) return;
    const slot = index[`${d.getFullYear()}-${d.getMonth()}`];
    if (slot === undefined) return;
    buckets[slot].amount += p.amount || 0;
    buckets[slot].orders += 1;
  });

  return buckets;
}

const priorityPill = (p) =>
  p === "high"
    ? "bg-red-100 text-red-700"
    : p === "medium"
    ? "bg-amber-100 text-amber-700"
    : "bg-surface-2 text-fg-muted";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: summaryRes, loading: loadingSummary } = useFetch(() => reportsApi.summary(), [], { key: "reports:summary" });
  const { data: activityRes } = useFetch(() => reportsApi.activity(6), [], { key: "reports:activity:6" });
  const { data: approvalsRes } = useFetch(() => approvalsApi.list({ status: "Pending" }), [], { key: "approvals:pending" });
  const { data: poRes } = useFetch(() => purchaseOrdersApi.list(), [], { key: "purchase-orders:all" });
  const { data: catRes } = useFetch(() => reportsApi.spendByCategory(), [], { key: "reports:by-category" });

  const s = summaryRes?.data;

  // ---- Chart series (derived from the PO list, no extra endpoint) ----
  const trend = useMemo(() => monthlySpend(poRes?.data || [], 6), [poRes]);
  const spendSpark = trend.map((t) => t.amount);
  const orderSpark = trend.map((t) => t.orders);
  const hasTrend = trend.some((t) => t.amount > 0);
  const momDelta = (() => {
    const prev = trend[trend.length - 2]?.amount || 0;
    const curr = trend[trend.length - 1]?.amount || 0;
    if (!prev) return undefined;
    return Math.round(((curr - prev) / prev) * 100);
  })();

  const categories = catRes?.data || [];
  const categoryShare = useMemo(
    () => categories.slice(0, 6).map((c) => ({ label: c.category, amount: c.amount })),
    [categories]
  );
  const categoryTotal = categories.reduce((t, c) => t + c.amount, 0);

  const stats = [
    { label: "Total Vendors", value: s ? String(s.vendors.total) : "—", icon: Users, color: "sky", hint: s ? `${s.vendors.active} active` : undefined },
    { label: "Open RFQs", value: s ? String(s.rfqs.open) : "—", icon: FileText, color: "blue", hint: s ? `${s.rfqs.total} all time` : undefined },
    { label: "Pending Approvals", value: s ? String(s.approvals.pending) : "—", icon: CheckCircle2, color: "violet", spark: orderSpark },
    { label: "PO Value (total)", value: s ? formatINR(s.purchaseOrders.totalSpend) : "—", icon: Receipt, color: "emerald", delta: momDelta, spark: spendSpark },
  ];

  const recentActivity = toTimelineItems(activityRes?.data || []);
  const pendingApprovals = (approvalsRes?.pending || []).slice(0, 3);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ---- Greeting ---- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">
            Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-fg-muted mt-1">
            Here's what's happening in your procurement pipeline today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="px-4 py-2.5 text-sm font-semibold text-fg bg-surface border border-border rounded-lg hover:bg-surface-2 transition"
          >
            View Reports
          </Link>
          <Link
            href="/rfqs/new"
            className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-2 shadow-sm shadow-blue-600/20"
          >
            <Plus size={16} /> Create RFQ
          </Link>
        </div>
      </div>

      {/* ---- Stats grid ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.color}
            hint={stat.hint}
            delta={stat.delta}
            spark={stat.spark}
            loading={loadingSummary}
          />
        ))}
      </div>

      {/* ---- Spend analytics ---- */}
      {(hasTrend || categoryShare.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {hasTrend && (
            <div className="lg:col-span-2">
              <ChartCard
                title="Committed spend"
                subtitle="Approved, sent & received POs over the last 6 months"
                height={260}
                className="h-full"
                action={
                  <Link
                    href="/reports"
                    className="text-sm font-semibold text-brand hover:underline flex items-center gap-1"
                  >
                    Reports <ArrowUpRight size={14} />
                  </Link>
                }
              >
                <AreaChartX
                  data={trend}
                  xKey="month"
                  dataKey="amount"
                  tickFormatter={formatCompactINR}
                  tooltipFormatter={(v) => [formatINR(v), "Spend"]}
                />
              </ChartCard>
            </div>
          )}

          {categoryShare.length > 0 && (
            <ChartCard
              title="Spend by category"
              subtitle="Share of committed PO value"
              height={260}
              className={hasTrend ? "" : "lg:col-span-3"}
              action={
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted">
                  <TrendingUp size={14} /> live
                </span>
              }
            >
              <PieChartX
                data={categoryShare}
                dataKey="amount"
                nameKey="label"
                centerLabel="total spend"
                centerValue={formatCompactINR(categoryTotal)}
                tooltipFormatter={(v, n) => [formatINR(v), n]}
              />
            </ChartCard>
          )}
        </div>
      )}

      {/* ---- Quick actions ---- */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Quick Actions</h2>
            {/* This card is slate-900 in BOTH themes, so its text stays on the
                fixed slate scale — a token would go dark-on-dark in light mode. */}
            <p className="text-slate-400 text-sm mt-0.5">
              Jump straight into what matters most
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium transition"
                >
                  <Icon size={16} />
                  <span>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Activity + Approvals ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-fg">Recent Activity</h2>
              <p className="text-sm text-fg-muted mt-0.5">Latest procurement events</p>
            </div>
            <Link
              href="/activity"
              className="text-sm font-semibold text-brand hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="p-6">
            <Timeline items={recentActivity} emptyLabel="No recent activity yet." />
          </div>
        </div>

        {/* Pending approvals */}
        <div className="bg-surface rounded-2xl border border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-fg">Pending Approvals</h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-brand-700 rounded-full">
                {approvalsRes?.counts?.pending ?? 0} new
              </span>
            </div>
            <p className="text-sm text-fg-muted mt-0.5">Awaiting your sign-off</p>
          </div>
          <div className="p-3 space-y-2">
            {pendingApprovals.length === 0 ? (
              <p className="p-4 text-sm text-fg-muted">You're all caught up.</p>
            ) : (
              pendingApprovals.map((po) => (
                <Link
                  key={po.id}
                  href="/approvals"
                  className="block p-4 rounded-xl border border-border hover:border-brand/40 hover:bg-blue-50/30 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-fg">{po.refId}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityPill(po.priority)}`}>
                      {po.priority}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted mb-2">{po.vendor}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-fg">{formatINR(po.amount)}</span>
                    <span className="text-xs font-semibold text-brand">Review →</span>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="p-4 border-t border-border">
            <Link
              href="/approvals"
              className="block w-full text-center py-2 text-sm font-semibold text-fg bg-surface-2 hover:bg-surface-2 rounded-lg transition"
            >
              View all approvals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
