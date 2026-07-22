"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Send, IndianRupee, Building2, Calendar, Receipt, FileText, Loader2, ShieldCheck } from "lucide-react";
import { invoicesApi, aiApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate, cn } from "@/lib/format";
import { PageHeader, Card, Badge, PrimaryButton, GhostButton, EmptyState } from "@/components/ui/kit";
import { useAiEnabled, AiButton, AiThinking, levelClass } from "@/components/ui/ai";

const GST_RATE = 0.18;

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(() => invoicesApi.get(id), [id], { key: "invoice" });
  const inv = data?.data;
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (inv) setStatus(inv.status);
  }, [inv]);

  const markPaid = async () => {
    setBusy(true);
    try {
      const res = await invoicesApi.pay(id); // full payment
      setStatus(res.data.status);
    } catch (e) {
      alert(e.message || "Could not record payment.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading invoice...
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back</Link>
        <Card className="p-6"><EmptyState icon={Receipt} title="Invoice not found" hint={error?.message || `No invoice with id ${id}`} /></Card>
      </div>
    );
  }

  const subtotal = inv.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back to invoices</Link>

      <PageHeader title={inv.id} subtitle={`Billed to ${inv.vendor}`}>
        <Badge status={status} />
        <GhostButton href={`/invoices/${inv.id}/print`}><Printer size={16} /> Print</GhostButton>
        <GhostButton href={`/invoices/${inv.id}/send`}><Send size={16} /> Send</GhostButton>
        {status !== "Paid" && status !== "Cancelled" && (
          <PrimaryButton onClick={markPaid}>
            {busy ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><IndianRupee size={16} /> Mark paid</>}
          </PrimaryButton>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-base font-bold text-slate-900 px-6 py-4 border-b border-slate-100">Items</h2>
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
                  {inv.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3.5 font-medium text-slate-800">{it.name}</td>
                      <td className="px-6 py-3.5 text-right text-slate-600">{it.qty}</td>
                      <td className="px-6 py-3.5 text-right text-slate-600">{formatINR(it.unitPrice)}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-900">{formatINR(it.qty * it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>GST (18%)</span><span>{formatINR(gst)}</span></div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold"><span className="text-slate-700">Total</span><span className="text-lg text-blue-600">{formatINR(total)}</span></div>
            </div>
          </Card>

          <InvoiceAudit invoiceId={inv.id} />
        </div>

        <Card className="p-6 h-fit space-y-4">
          <Meta icon={Building2} label="Vendor" value={inv.vendor} href={inv.vendorId ? `/vendors/${inv.vendorId}` : null} />
          {inv.poId && <Meta icon={FileText} label="Linked PO" value={inv.poId} href={`/purchase-orders/${inv.poId}`} />}
          <Meta icon={Calendar} label="Issued" value={formatDate(inv.issued)} />
          <Meta icon={Calendar} label="Due" value={formatDate(inv.due)} />
        </Card>
      </div>
    </div>
  );
}

// On-demand AI audit: 3-way match against the PO + duplicate detection.
function InvoiceAudit({ invoiceId }) {
  const aiEnabled = useAiEnabled();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!aiEnabled) return null;

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await aiApi.invoiceAudit(invoiceId);
      setAudit(data);
    } catch (e) {
      setError(e.message || "Could not audit this invoice.");
    } finally {
      setLoading(false);
    }
  };

  const sevClass = (s) =>
    s === "critical" ? "text-red-700 bg-red-50" : s === "warning" ? "text-amber-700 bg-amber-50" : "text-slate-600 bg-slate-50";

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-violet-900">
          <ShieldCheck size={18} /> AI invoice audit
        </h2>
        {audit && (
          <span className={cn("inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full uppercase", levelClass(audit.verdict))}>
            {audit.verdict} · {audit.confidence}%
          </span>
        )}
      </div>

      {loading ? (
        <AiThinking label="Matching against the purchase order…" />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !audit ? (
        <div>
          <p className="text-sm text-slate-500 mb-3">Run a 3-way match against the linked PO and check for duplicate payments before you pay.</p>
          <AiButton onClick={run}>Audit invoice</AiButton>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed">{audit.summary}</p>
          {audit.duplicateSuspect && (
            <p className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">⚠ Possible duplicate payment — review before paying.</p>
          )}
          {audit.findings?.length > 0 && (
            <ul className="space-y-1.5">
              {audit.findings.map((f, i) => (
                <li key={i} className={cn("text-sm rounded-lg px-3 py-2", sevClass(f.severity))}>
                  <span className="font-semibold uppercase text-[10px] mr-2">{f.severity}</span>{f.message}
                </li>
              ))}
            </ul>
          )}
          <button onClick={run} className="text-xs font-semibold text-violet-700 hover:text-violet-900">Re-run audit</button>
        </div>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label, value, href }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-slate-400" />
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        {href ? <Link href={href} className="text-sm font-semibold text-blue-600 hover:underline">{value}</Link>
          : <span className="text-sm font-semibold text-slate-900">{value}</span>}
      </div>
    </div>
  );
}
