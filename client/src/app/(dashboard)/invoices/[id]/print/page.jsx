"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Download, Loader2 } from "lucide-react";
import { invoicesApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { COMPANY } from "@/lib/constants";
import { formatINR, formatDate } from "@/lib/format";
import { downloadInvoicePdf } from "@/lib/pdf";

const GST_RATE = 0.18;

export default function InvoicePrintPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(() => invoicesApi.get(id), [id]);
  const inv = data?.data;
  const [pdfBusy, setPdfBusy] = useState(false);

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadInvoicePdf(inv, COMPANY, `${inv.id}.pdf`);
    } catch (e) {
      alert("Could not generate the PDF: " + (e?.message || e));
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading invoice...
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-slate-700 font-semibold">Invoice not found</p>
        <Link href="/invoices" className="text-blue-600 font-medium hover:underline mt-2 inline-block">Back to invoices</Link>
      </div>
    );
  }

  const subtotal = inv.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print flex items-center justify-between mb-6">
        <Link href={`/invoices/${inv.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600">
          <ArrowLeft size={16} /> Back to invoice
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition">
            <Printer size={16} /> Print
          </button>
          <button onClick={downloadPdf} disabled={pdfBusy} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-60">
            {pdfBusy ? <><Loader2 size={16} className="animate-spin" /> Preparing...</> : <><Download size={16} /> Download PDF</>}
          </button>
        </div>
      </div>

      {/* Printable document */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 print:border-0 print:rounded-none">
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-black text-xl">W</span>
            </span>
            <div>
              <p className="text-xl font-extrabold italic text-slate-900">Wolf</p>
              <p className="text-xs text-slate-500">{COMPANY.name}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold tracking-wide text-blue-800">TAX INVOICE</h1>
            <p className="text-sm font-semibold text-slate-700 mt-1">{inv.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">From</p>
            <p className="font-semibold text-slate-900">{COMPANY.name}</p>
            <p className="text-slate-500">{COMPANY.address}</p>
            <p className="text-slate-500">GSTIN: {COMPANY.gstin}</p>
            <p className="text-slate-500">{COMPANY.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Bill to</p>
            <p className="font-semibold text-slate-900">{inv.vendor}</p>
            <p className="text-slate-500">Ref PO: {inv.poId}</p>
            <p className="text-slate-500">Issued: {formatDate(inv.issued)}</p>
            <p className="text-slate-500">Due: {formatDate(inv.due)}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <th className="px-4 py-3 rounded-l-lg">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right rounded-r-lg">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{it.name}</td>
                <td className="px-4 py-3 text-right text-slate-600">{it.qty}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatINR(it.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatINR(it.qty * it.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>GST (18%)</span><span>{formatINR(gst)}</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base"><span className="text-slate-900">Total</span><span className="text-blue-600">{formatINR(total)}</span></div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-12 pt-6 border-t border-slate-100 text-center">
          This is a computer-generated invoice and does not require a signature. · {COMPANY.phone}
        </p>
      </div>
    </div>
  );
}
