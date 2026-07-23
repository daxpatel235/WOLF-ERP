"use client";

import { useState, useMemo } from "react";
import { Download, Printer, FileText, TrendingUp, Users, ShoppingCart, Receipt, Wallet, Loader2 } from "lucide-react";
import { reportsApi, aiApi, purchaseOrdersApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatCompactINR } from "@/lib/format";
import { saveFile } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/pdf";
import { PageHeader, Card, GhostButton } from "@/components/ui/kit";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard, BarChartX, AreaChartX, PieChartX, CHART_COLORS } from "@/components/ui/Chart";
import { useAiEnabled, AiButton, AiPanel, AiThinking } from "@/components/ui/ai";
import { useToast } from "@/components/ui/Toast";
import { RoleGate } from "@/components/shared/RoleGate";

// Statuses whose POs count as committed spend — mirrors the server's SPENDABLE.
const SPENDABLE = ["Approved", "Sent", "Received"];

// Roll POs up into the last `months` calendar buckets so the trend line always
// spans a fixed window, including the months with no orders at all.
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

export default function ReportsPage() {
  const { data: summaryRes, loading } = useFetch(() => reportsApi.summary(), [], { key: "reports:summary" });
  const { data: catRes } = useFetch(() => reportsApi.spendByCategory(), [], { key: "reports:by-category" });
  const { data: vendorRes } = useFetch(() => reportsApi.spendByVendor(), [], { key: "reports:by-vendor" });
  const { data: poRes } = useFetch(() => purchaseOrdersApi.list(), [], { key: "purchase-orders" });
  const toast = useToast();

  const s = summaryRes?.data;
  const categories = catRes?.data || [];
  const maxCat = Math.max(1, ...categories.map((c) => c.amount));
  const topVendors = (vendorRes?.data || []).slice(0, 5);

  const totalSpend = categories.reduce((t, c) => t + c.amount, 0);

  // ---- Chart series ----
  const trend = useMemo(() => monthlySpend(poRes?.data || [], 6), [poRes]);
  const categoryBars = useMemo(() => categories.slice(0, 7), [categories]);
  const vendorShare = useMemo(
    () => topVendors.map((v) => ({ label: v.vendor, amount: v.amount })),
    [topVendors]
  );
  const spendTrendSpark = trend.map((t) => t.amount);
  // Month-over-month movement on committed spend — the delta pill on the KPI.
  const momDelta = (() => {
    const prev = trend[trend.length - 2]?.amount || 0;
    const curr = trend[trend.length - 1]?.amount || 0;
    if (!prev) return undefined;
    return Math.round(((curr - prev) / prev) * 100);
  })();

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
      toast.error(e.message || "Could not generate the summary.");
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
      toast.error("Could not generate the PDF: " + (e?.message || e));
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <RoleGate permission="canViewReports" title="Reports are restricted">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        {kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.value}
            icon={k.icon}
            tone={k.color}
            loading={loading}
            delta={k.label === "Total Spend" ? momDelta : undefined}
            spark={k.label === "Total Spend" ? spendTrendSpark : undefined}
          />
        ))}
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

      {/* Spend trend (last 6 months) */}
      <div className="mb-6">
        {trend.some((t) => t.amount > 0) ? (
          <ChartCard
            title="Committed spend"
            subtitle="Approved, sent & received POs over the last 6 months"
            height={260}
            action={
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted">
                <TrendingUp size={14} /> live
              </span>
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
        ) : (
          <Card className="p-6">
            <h2 className="text-base font-bold text-fg mb-1">Committed spend</h2>
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Loading...</> : "No committed spend in the last 6 months."}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend by category (bars) */}
        <div className="lg:col-span-2">
          {categories.length === 0 ? (
            <Card className="p-6 h-full">
              <h2 className="text-base font-bold text-fg mb-6">Spend by category</h2>
              <div className="flex items-center justify-center gap-2 py-16 text-fg-muted">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Loading...</> : "No spend recorded yet."}
              </div>
            </Card>
          ) : (
            <ChartCard
              title="Spend by category"
              subtitle="Committed PO value grouped by vendor category"
              height={300}
              className="h-full"
              action={
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted">
                  <TrendingUp size={14} /> live
                </span>
              }
            >
              <BarChartX
                data={categoryBars}
                xKey="category"
                dataKey="amount"
                tickFormatter={formatCompactINR}
                tooltipFormatter={(v) => [formatINR(v), "Spend"]}
              />
            </ChartCard>
          )}
        </div>

        {/* Vendor share (donut) */}
        {vendorShare.length > 0 ? (
          <ChartCard
            title="Top vendor share"
            subtitle="Share of committed spend"
            height={300}
          >
            <PieChartX
              data={vendorShare}
              dataKey="amount"
              nameKey="label"
              centerLabel="total spend"
              centerValue={formatCompactINR(totalSpend)}
              tooltipFormatter={(v, n) => [formatINR(v), n]}
              legend
            />
          </ChartCard>
        ) : (
          <Card className="p-6">
            <h2 className="text-base font-bold text-fg mb-6">Top vendor share</h2>
            <p className="text-sm text-fg-muted">No vendor spend yet.</p>
          </Card>
        )}
      </div>

      {/* Category breakdown (exact figures beside the chart) */}
      <Card className="p-6 mt-6">
        <h2 className="text-base font-bold text-fg mb-6">Category breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {categories.length === 0 ? (
            <p className="text-sm text-fg-muted">No data yet.</p>
          ) : (
            categories.map((c, i) => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {c.category}
                  </span>
                  <span className="font-semibold text-fg tabular-nums">{formatINR(c.amount)}</span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(c.amount / maxCat) * 100}%`,
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Top vendors */}
      <Card className="mt-6">
        <h2 className="text-base font-bold text-fg px-6 py-4 border-b border-border">Top vendors by spend</h2>
        <div className="divide-y divide-border">
          {topVendors.length === 0 ? (
            <p className="px-6 py-8 text-sm text-fg-muted text-center">No vendor spend yet.</p>
          ) : (
            topVendors.map((v, i) => (
              <div key={v.vendorId || v.vendor} className="flex items-center gap-4 px-6 py-3.5">
                <span className="w-6 text-sm font-bold text-fg-muted">#{i + 1}</span>
                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-semibold text-xs">
                  {(v.vendor || "").split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-fg">{v.vendor}</p>
                  <p className="text-xs text-fg-muted">{v.orders} orders</p>
                </div>
                <span className="text-sm font-bold text-fg">{formatINR(v.amount)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
      </div>
    </div>
    </RoleGate>
  );
}
