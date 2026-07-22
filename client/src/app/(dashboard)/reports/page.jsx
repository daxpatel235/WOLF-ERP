"use client";

import { useState } from "react";
import { Download, Printer, FileText, TrendingUp, Users, ShoppingCart, Receipt, Wallet, Loader2 } from "lucide-react";
import { reportsApi, aiApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, cn } from "@/lib/format";
import { saveFile } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/pdf";
import { PageHeader, Card, GhostButton } from "@/components/ui/kit";
import { useAiEnabled, AiButton, AiPanel, AiThinking } from "@/components/ui/ai";

const kpiColor = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
};

export default function ReportsPage() {
  const { data: summaryRes, loading } = useFetch(() => reportsApi.summary(), [], { key: "reports:summary" });
  const { data: catRes } = useFetch(() => reportsApi.spendByCategory(), [], { key: "reports:by-category" });
  const { data: vendorRes } = useFetch(() => reportsApi.spendByVendor(), [], { key: "reports:by-vendor" });

  const s = summaryRes?.data;
  const categories = catRes?.data || [];
  const maxCat = Math.max(1, ...categories.map((c) => c.amount));
  const topVendors = (vendorRes?.data || []).slice(0, 5);

  const totalSpend = categories.reduce((t, c) => t + c.amount, 0);

  const kpis = [
    { label: "Total Spend", value: formatINR(totalSpend), icon: Wallet, color: "blue" },
    { label: "PO Value", value: s ? formatINR(s.purchaseOrders.totalSpend) : "—", icon: ShoppingCart, color: "emerald" },
    { label: "Outstanding", value: s ? formatINR(s.invoices.outstanding) : "—", icon: Receipt, color: "amber" },
    { label: "Active Vendors", value: s ? s.vendors.active : "—", icon: Users, color: "violet" },
  ];

  // Download the full report as a CSV (KPIs + categories + top vendors).
  const download = () => {
    const rows = [];
    rows.push(["Wolf ERP — Procurement Report"]);
    rows.push(["Generated", new Date().toLocaleString("en-IN")]);
    rows.push([]);
    rows.push(["KPI", "Value"]);
    kpis.forEach((k) => rows.push([k.label, String(k.value)]));
    rows.push([]);
    rows.push(["Category", "Spend (INR)"]);
    categories.forEach((c) => rows.push([c.category, c.amount]));
    rows.push([]);
    rows.push(["Top Vendor", "Orders", "Spend (INR)"]);
    topVendors.forEach((v) => rows.push([v.vendor, v.orders, v.amount]));

    const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? "")}"`).join(",")).join("\n");
    // Opens a "Save As" dialog (Chrome/Edge) so you choose where to save it.
    saveFile(`wolf-report-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  };

  const print = () => window.print();

  // --- AI executive summary ---
  const aiEnabled = useAiEnabled();
  const [aiSummary, setAiSummary] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const generateSummary = async () => {
    setAiBusy(true);
    try {
      const { data } = await aiApi.reportSummary();
      setAiSummary(data.summary);
    } catch (e) {
      alert(e.message || "Could not generate the summary.");
    } finally {
      setAiBusy(false);
    }
  };

  const [pdfBusy, setPdfBusy] = useState(false);
  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadReportPdf({ kpis, categories, topVendors }, `wolf-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      alert("Could not generate the PDF: " + (e?.message || e));
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Reports" subtitle="Procurement spend analytics & insights">
        <GhostButton onClick={print} className="no-print"><Printer size={16} /> Print</GhostButton>
        <GhostButton onClick={downloadPdf} className="no-print">
          {pdfBusy ? <><Loader2 size={16} className="animate-spin" /> Preparing...</> : <><FileText size={16} /> PDF</>}
        </GhostButton>
        <GhostButton onClick={download} className="no-print"><Download size={16} /> CSV</GhostButton>
      </PageHeader>

      <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-5">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", kpiColor[k.color])}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{loading ? "—" : k.value}</p>
              <p className="text-sm text-slate-500">{k.label}</p>
            </Card>
          );
        })}
      </div>

      {/* AI executive summary */}
      {aiEnabled && (
        <div className="mb-6 no-print">
          {aiSummary ? (
            <AiPanel
              title="AI executive summary"
              footer={
                <button onClick={generateSummary} disabled={aiBusy} className="text-xs font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-50">
                  {aiBusy ? "Regenerating…" : "Regenerate"}
                </button>
              }
            >
              <p className="whitespace-pre-line">{aiSummary}</p>
            </AiPanel>
          ) : aiBusy ? (
            <AiPanel title="AI executive summary"><AiThinking label="Summarising your procurement data…" /></AiPanel>
          ) : (
            <AiButton onClick={generateSummary} loading={aiBusy}>Summarise with AI</AiButton>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend by category (bars) */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-900">Spend by category</h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400"><TrendingUp size={14} /> live</span>
          </div>
          {categories.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Loading...</> : "No spend recorded yet."}
            </div>
          ) : (
            <div className="flex items-end justify-between gap-3 h-48">
              {categories.slice(0, 7).map((c) => (
                <div key={c.category} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center h-40">
                    <div
                      className="w-full max-w-[44px] rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all hover:from-blue-700"
                      style={{ height: `${Math.max(4, (c.amount / maxCat) * 100)}%` }}
                      title={formatINR(c.amount)}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 text-center leading-tight">{c.category}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Spend by category (list with progress) */}
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-6">Category breakdown</h2>
          <div className="space-y-4">
            {categories.length === 0 ? (
              <p className="text-sm text-slate-400">No data yet.</p>
            ) : (
              categories.map((c) => (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-600">{c.category}</span>
                    <span className="font-semibold text-slate-900">{formatINR(c.amount)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Top vendors */}
      <Card className="mt-6">
        <h2 className="text-base font-bold text-slate-900 px-6 py-4 border-b border-slate-100">Top vendors by spend</h2>
        <div className="divide-y divide-slate-100">
          {topVendors.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400 text-center">No vendor spend yet.</p>
          ) : (
            topVendors.map((v, i) => (
              <div key={v.vendorId || v.vendor} className="flex items-center gap-4 px-6 py-3.5">
                <span className="w-6 text-sm font-bold text-slate-400">#{i + 1}</span>
                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-semibold text-xs">
                  {(v.vendor || "").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{v.vendor}</p>
                  <p className="text-xs text-slate-400">{v.orders} orders</p>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatINR(v.amount)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
      </div>
    </div>
  );
}
