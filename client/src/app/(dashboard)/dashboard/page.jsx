"use client";

import Link from "next/link";
import {
  Users,
  FileText,
  CheckCircle2,
  Receipt,
  ArrowUpRight,
  Plus,
  Clock,
  Package,
  AlertCircle,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import { reportsApi, approvalsApi } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { timeAgo } from "@/lib/utils";

const quickActions = [
  { label: "Add Vendor", href: "/vendors/new", icon: Users },
  { label: "Create RFQ", href: "/rfqs/new", icon: FileText },
  { label: "New PO", href: "/purchase-orders/new", icon: ShoppingCart },
  { label: "Generate Invoice", href: "/invoices/new", icon: Receipt },
];

const colorMap = {
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
};

// Pick an icon for an activity entry based on its action verb.
function activityIcon(action = "") {
  const a = action.toLowerCase();
  if (a.includes("approv")) return { Icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-600" };
  if (a.includes("reject")) return { Icon: AlertCircle, cls: "bg-red-100 text-red-600" };
  if (a.includes("quotation")) return { Icon: Package, cls: "bg-sky-100 text-sky-600" };
  if (a.includes("invoice") || a.includes("sent")) return { Icon: Receipt, cls: "bg-violet-100 text-violet-600" };
  return { Icon: FileText, cls: "bg-blue-100 text-blue-600" };
}

const priorityPill = (p) =>
  p === "high"
    ? "bg-red-100 text-red-700"
    : p === "medium"
    ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: summaryRes, loading: loadingSummary } = useFetch(() => reportsApi.summary(), []);
  const { data: activityRes } = useFetch(() => reportsApi.activity(6), []);
  const { data: approvalsRes } = useFetch(() => approvalsApi.list({ status: "Pending" }), []);

  const s = summaryRes?.data;
  const stats = [
    { label: "Total Vendors", value: s ? String(s.vendors.total) : "—", icon: Users, color: "sky" },
    { label: "Open RFQs", value: s ? String(s.rfqs.open) : "—", icon: FileText, color: "blue" },
    { label: "Pending Approvals", value: s ? String(s.approvals.pending) : "—", icon: CheckCircle2, color: "violet" },
    { label: "PO Value (total)", value: s ? formatINR(s.purchaseOrders.totalSpend) : "—", icon: Receipt, color: "emerald" },
  ];

  const recentActivity = activityRes?.data || [];
  const pendingApprovals = (approvalsRes?.pending || []).slice(0, 3);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ---- Greeting ---- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Here's what's happening in your procurement pipeline today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ring-1 ${colorMap[stat.color]}`}>
                  <Icon size={20} />
                </div>
                {loadingSummary && <Loader2 size={16} className="animate-spin text-slate-300" />}
              </div>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-900">{stat.value}</h3>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ---- Quick actions ---- */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Quick Actions</h2>
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
              <p className="text-sm text-slate-500 mt-0.5">Latest procurement events</p>
            </div>
            <Link
              href="/reports"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">No recent activity yet.</p>
            ) : (
              recentActivity.map((item) => {
                const { Icon, cls } = activityIcon(item.action);
                return (
                  <div key={item.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition">
                    <div className={`p-2.5 rounded-lg ${cls}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{item.message || item.action}</p>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        {item.actor}
                        {item.entityId ? ` · ${item.entityId}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                      <Clock size={12} />
                      {timeAgo(item.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pending approvals */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Pending Approvals</h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                {approvalsRes?.counts?.pending ?? 0} new
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Awaiting your sign-off</p>
          </div>
          <div className="p-3 space-y-2">
            {pendingApprovals.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">You're all caught up.</p>
            ) : (
              pendingApprovals.map((po) => (
                <Link
                  key={po.id}
                  href="/approvals"
                  className="block p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900">{po.refId}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityPill(po.priority)}`}>
                      {po.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{po.vendor}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{formatINR(po.amount)}</span>
                    <span className="text-xs font-semibold text-blue-600">Review →</span>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="p-4 border-t border-slate-100">
            <Link
              href="/approvals"
              className="block w-full text-center py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              View all approvals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
