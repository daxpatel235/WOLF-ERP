"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, Truck, CalendarClock, FileSpreadsheet, Loader2 } from "lucide-react";
import { quotationsApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, PrimaryButton, GhostButton, EmptyState } from "@/components/ui/kit";

export default function QuotationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, loading, error } = useFetch(() => quotationsApi.get(id), [id]);
  const quote = data?.data;
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (quote) setStatus(quote.status);
  }, [quote]);

  const award = async () => {
    setBusy(true);
    try {
      const res = await quotationsApi.award(id);
      setStatus("Awarded");
      // Jump straight to the drafted purchase order.
      if (res.purchaseOrder?.id) router.push(`/purchase-orders/${res.purchaseOrder.id}`);
    } catch (e) {
      alert(e.message || "Could not award quotation.");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (next) => {
    setBusy(true);
    try {
      if (next === "Shortlisted") await quotationsApi.shortlist(id);
      else await quotationsApi.setStatus(id, next);
      setStatus(next);
    } catch (e) {
      alert(e.message || "Could not update quotation.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading quotation...
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/quotations" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back</Link>
        <Card className="p-6"><EmptyState icon={FileSpreadsheet} title="Quotation not found" hint={error?.message || `No quote with id ${id}`} /></Card>
      </div>
    );
  }

  const total = quote.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/quotations" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back to quotations</Link>

      <PageHeader title={`Quote ${quote.id}`} subtitle={`${quote.vendor} · for `}>
        <Badge status={status} />
      </PageHeader>
      <p className="-mt-4 mb-6 text-sm text-slate-500">
        Against <Link href={`/rfqs/${quote.rfqId}`} className="text-blue-600 font-medium hover:underline">{quote.rfqId}</Link> — {quote.rfqTitle}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-base font-bold text-slate-900 px-6 py-4 border-b border-slate-100">Line items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3 text-right">Qty</th>
                    <th className="px-6 py-3 text-right">Unit price</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quote.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3.5 font-medium text-slate-800">{it.name}</td>
                      <td className="px-6 py-3.5 text-right text-slate-600">{it.qty}</td>
                      <td className="px-6 py-3.5 text-right text-slate-600">{formatINR(it.unitPrice)}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-900">{formatINR(it.qty * it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td colSpan={3} className="px-6 py-4 text-right font-semibold text-slate-700">Total quoted</td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-blue-600">{formatINR(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <Meta icon={Truck} label="Delivery" value={`${quote.deliveryDays} days`} />
            <Meta icon={CalendarClock} label="Valid till" value={formatDate(quote.validTill)} />
            <Meta icon={FileSpreadsheet} label="Submitted" value={formatDate(quote.submitted)} />
          </Card>

          <Card className="p-6 space-y-3">
            <p className="text-sm font-semibold text-slate-900">Decision</p>
            {status === "Awarded" ? (
              <p className="text-sm text-emerald-600 font-medium flex items-center gap-2"><Check size={16} /> This quote was awarded.</p>
            ) : status === "Rejected" ? (
              <p className="text-sm text-red-600 font-medium flex items-center gap-2"><X size={16} /> This quote was rejected.</p>
            ) : (
              <>
                <PrimaryButton className="w-full" onClick={award}>
                  {busy ? <><Loader2 size={16} className="animate-spin" /> Working...</> : <><Check size={16} /> Award &amp; create PO</>}
                </PrimaryButton>
                <button onClick={() => changeStatus("Shortlisted")} disabled={busy}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition disabled:opacity-50">
                  Shortlist
                </button>
                <button onClick={() => changeStatus("Rejected")} disabled={busy}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                  Reject
                </button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-slate-400" />
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-sm font-semibold text-slate-900">{value}</span>
      </div>
    </div>
  );
}
