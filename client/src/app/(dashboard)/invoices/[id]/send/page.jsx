"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, CheckCircle2, Paperclip } from "lucide-react";
import { invoicesApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { useVendors } from "@/hooks/useVendors";
import { formatINR } from "@/lib/format";
import { PageHeader, Card, PrimaryButton, GhostButton, EmptyState } from "@/components/ui/kit";

const inputCls =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

export default function SendInvoicePage() {
  const { id } = useParams();
  const { data, loading, error: loadError } = useFetch(() => invoicesApi.get(id), [id]);
  const inv = data?.data;
  const { vendors } = useVendors();
  const vendor = inv ? vendors.find((v) => v.id === inv.vendorId) : null;

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Prefill the form once the invoice (and vendor) are available.
  useEffect(() => {
    if (!inv) return;
    setSubject(`Invoice ${inv.id} from Wolf ERP`);
    setMessage(
      `Hi ${vendor?.contact || "there"},\n\nPlease find attached invoice ${inv.id} for ${formatINR(inv.amount)}, due ${inv.due ? new Date(inv.due).toLocaleDateString("en-IN") : "soon"}.\n\nThanks,\nWolf ERP Accounts`
    );
    if (vendor?.email) setTo(vendor.email);
  }, [inv, vendor]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading invoice...
      </div>
    );
  }

  if (loadError || !inv) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back</Link>
        <Card className="p-6"><EmptyState title="Invoice not found" hint={loadError?.message || `No invoice with id ${id}`} /></Card>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return setError("Enter a valid recipient email");
    setSending(true);
    try {
      await invoicesApi.send(inv.id, { to, note: message });
      setSent(true);
    } catch (e2) {
      setError(e2.message || "Could not send the invoice.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Invoice sent</h2>
          <p className="text-slate-500 mt-2">{inv.id} was emailed to <span className="font-semibold text-slate-700">{to}</span>.</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <GhostButton href={`/invoices/${inv.id}`}>Back to invoice</GhostButton>
            <PrimaryButton onClick={() => (window.location.href = "/invoices")}>Done</PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/invoices/${inv.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back to invoice</Link>
      <PageHeader title="Send invoice" subtitle={`Email ${inv.id} to the vendor.`} />

      <Card className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} placeholder="vendor@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3.5 py-2.5">
            <Paperclip size={15} /> {inv.id}.pdf attached ({formatINR(inv.amount)})
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <GhostButton href={`/invoices/${inv.id}`}>Cancel</GhostButton>
            <PrimaryButton type="submit">
              {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send invoice</>}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
