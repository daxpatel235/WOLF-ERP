"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Send, Check, Building2, Calendar, ShoppingCart, Receipt, Clock, Loader2 } from "lucide-react";
import { purchaseOrdersApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, PrimaryButton, GhostButton, EmptyState } from "@/components/ui/kit";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(() => purchaseOrdersApi.get(id), [id]);
  const po = data?.data;
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (po) setStatus(po.status);
  }, [po]);

  const submitForApproval = async () => {
    setBusy(true);
    try {
      const res = await purchaseOrdersApi.submit(id);
      setStatus(res.data.status);
    } catch (e) {
      alert(e.message || "Could not submit.");
    } finally {
      setBusy(false);
    }
  };

  const setPoStatus = async (next) => {
    setBusy(true);
    try {
      const res = await purchaseOrdersApi.setStatus(id, next);
      setStatus(res.data.status);
    } catch (e) {
      alert(e.message || "Could not update status.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading purchase order...
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/purchase-orders" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back</Link>
        <Card className="p-6"><EmptyState icon={ShoppingCart} title="PO not found" hint={error?.message || `No PO with id ${id}`} /></Card>
      </div>
    );
  }

  const total = po.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/purchase-orders" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back to POs</Link>

      <PageHeader title={po.id} subtitle={`Issued to ${po.vendor}`}>
        <Badge status={status} />
        <GhostButton onClick={() => window.print()}><Printer size={16} /> Print</GhostButton>
        {busy && <Loader2 size={16} className="animate-spin text-slate-400" />}
        {status === "Draft" && (
          <PrimaryButton onClick={submitForApproval}><Clock size={16} /> Submit for approval</PrimaryButton>
        )}
        {status === "Approved" && (
          <PrimaryButton onClick={() => setPoStatus("Sent")}><Send size={16} /> Send to vendor</PrimaryButton>
        )}
        {status === "Sent" && (
          <PrimaryButton onClick={() => setPoStatus("Received")}><Check size={16} /> Mark received</PrimaryButton>
        )}
        {(status === "Sent" || status === "Received") && (
          <Link href={`/invoices/new?po=${po.id}`}>
            <GhostButton><Receipt size={16} /> Create invoice</GhostButton>
          </Link>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                  {po.items.map((it, i) => (
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
                    <td colSpan={3} className="px-6 py-4 text-right font-semibold text-slate-700">Total</td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-blue-600">{formatINR(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>

        <Card className="p-6 h-fit space-y-4">
          <Meta icon={Building2} label="Vendor" value={po.vendor} href={po.vendorId ? `/vendors/${po.vendorId}` : null} />
          <Meta icon={Calendar} label="Created" value={formatDate(po.created)} />
          <Meta icon={Calendar} label="Expected delivery" value={formatDate(po.delivery)} />
        </Card>
      </div>
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
