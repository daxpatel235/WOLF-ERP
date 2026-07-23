"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Send, Check, Building2, Calendar, ShoppingCart, Receipt, Clock, Loader2 } from "lucide-react";
import { purchaseOrdersApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, PrimaryButton, GhostButton, EmptyState } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Modal";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(() => purchaseOrdersApi.get(id), [id], { key: "purchase-order" });
  const po = data?.data;
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (po) setStatus(po.status);
  }, [po]);

  const submitForApproval = async () => {
    const ok = await confirm({
      title: "Submit for approval?",
      message: "The purchase order will be locked for editing while an approver reviews it.",
      confirmLabel: "Submit",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await purchaseOrdersApi.submit(id);
      setStatus(res.data.status);
      toast.success("Sent for approval.");
    } catch (e) {
      toast.error(e.message || "Could not submit.");
    } finally {
      setBusy(false);
    }
  };

  const setPoStatus = async (next) => {
    // Cancelling is terminal — everything else is a routine step forward.
    if (next === "Cancelled") {
      const ok = await confirm({
        title: "Cancel this purchase order?",
        message: "This cannot be undone. The vendor will need a new PO to proceed.",
        confirmLabel: "Cancel PO",
        cancelLabel: "Keep it",
        danger: true,
      });
      if (!ok) return;
    }

    setBusy(true);
    try {
      const res = await purchaseOrdersApi.setStatus(id, next);
      setStatus(res.data.status);
      toast.success(`Purchase order marked ${next}.`);
    } catch (e) {
      toast.error(e.message || "Could not update status.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 py-24 text-fg-muted">
        <Loader2 size={18} className="animate-spin" /> Loading purchase order...
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/purchase-orders" className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-brand mb-4"><ArrowLeft size={16} /> Back</Link>
        <Card className="p-6"><EmptyState icon={ShoppingCart} title="PO not found" hint={error?.message || `No PO with id ${id}`} /></Card>
      </div>
    );
  }

  const total = po.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/purchase-orders" className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-brand mb-4"><ArrowLeft size={16} /> Back to POs</Link>

      <PageHeader title={po.id} subtitle={`Issued to ${po.vendor}`}>
        <Badge status={status} />
        <GhostButton onClick={() => window.print()}><Printer size={16} /> Print</GhostButton>
        {busy && <Loader2 size={16} className="animate-spin text-fg-muted" />}
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
            <h2 className="text-base font-bold text-fg px-6 py-4 border-b border-border">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-fg-muted uppercase border-b border-border">
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3 text-right">Qty</th>
                    <th className="px-6 py-3 text-right">Unit price</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {po.items.map((it, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3.5 font-medium text-fg">{it.name}</td>
                      <td className="px-6 py-3.5 text-right text-fg-muted">{it.qty}</td>
                      <td className="px-6 py-3.5 text-right text-fg-muted">{formatINR(it.unitPrice)}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-fg">{formatINR(it.qty * it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={3} className="px-6 py-4 text-right font-semibold text-fg">Total</td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-brand">{formatINR(total)}</td>
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
      <Icon size={16} className="text-fg-muted" />
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-fg-muted">{label}</span>
        {href ? <Link href={href} className="text-sm font-semibold text-brand hover:underline">{value}</Link>
          : <span className="text-sm font-semibold text-fg">{value}</span>}
      </div>
    </div>
  );
}
