"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, ShoppingCart, Receipt, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { approvalsApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate, priorityClass } from "@/lib/format";
import { PageHeader, Card, EmptyState } from "@/components/ui/kit";

const TYPE_ICON = {
  "Purchase Order": ShoppingCart,
  Invoice: Receipt,
  "RFQ Approval": FileText,
};

const hrefFor = (a) => {
  if (a.type === "Purchase Order") return `/purchase-orders/${a.refId}`;
  if (a.type === "Invoice") return `/invoices/${a.refId}`;
  return `/rfqs/${a.refId}`;
};

export default function ApprovalsPage() {
  const { data, loading, error, refetch } = useFetch(() => approvalsApi.list(), []);
  const [busyId, setBusyId] = useState(null);

  const pending = data?.pending || [];
  const done = data?.decided || [];

  const decide = async (id, decision) => {
    setBusyId(id);
    try {
      await approvalsApi.decide(id, { decision });
      await refetch();
    } catch (e) {
      alert(e.message || "Could not record decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Approvals"
        subtitle={`${pending.length} item${pending.length === 1 ? "" : "s"} awaiting your sign-off`}
      />

      <Card>
        <h2 className="text-base font-bold text-slate-900 px-6 py-4 border-b border-slate-100">Pending queue</h2>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 size={18} className="animate-spin" /> Loading approvals...</div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Couldn't load approvals" hint={error.message} />
        ) : pending.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up!" hint="No approvals waiting on you." />
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map((a) => {
              const Icon = TYPE_ICON[a.type] || FileText;
              const busy = busyId === a.id;
              return (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4">
                  <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={hrefFor(a)} className="text-sm font-semibold text-slate-900 hover:text-blue-600">{a.refId}</Link>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityClass(a.priority)}`}>{a.priority}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.type} · {a.vendor && a.vendor !== "—" ? `${a.vendor} · ` : ""}by {a.requestedBy} · {formatDate(a.date)}
                    </p>
                  </div>
                  {a.amount > 0 && <span className="text-sm font-bold text-slate-900">{formatINR(a.amount)}</span>}
                  <div className="flex items-center gap-2">
                    <button onClick={() => decide(a.id, "Rejected")} disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Reject
                    </button>
                    <button onClick={() => decide(a.id, "Approved")} disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {done.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-base font-bold text-slate-900 px-6 py-4 border-b border-slate-100">Recently decided</h2>
          <div className="divide-y divide-slate-100">
            {done.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.refId}</p>
                  <p className="text-xs text-slate-400">{a.type} · {a.vendor && a.vendor !== "—" ? a.vendor : a.requestedBy}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${a.status === "Approved" ? "text-emerald-600" : "text-red-600"}`}>
                  {a.status === "Approved" ? <Check size={16} /> : <X size={16} />} {a.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
