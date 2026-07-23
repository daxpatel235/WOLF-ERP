"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Truck, Check, GitCompare, Loader2 } from "lucide-react";
import { quotationsApi, aiApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, cn } from "@/lib/format";
import { PageHeader, Card, EmptyState } from "@/components/ui/kit";
import { useAiEnabled, AiButton, AiPanel, AiThinking } from "@/components/ui/ai";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Modal";

function CompareInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("rfq");

  // Build the list of RFQs that actually have quotations to compare.
  const { data: quotesRes } = useFetch(() => quotationsApi.list(), [], { key: "quotations" });
  const comparableRfqIds = [
    ...new Set((quotesRes?.data || []).map((q) => q.rfqId).filter(Boolean)),
  ];

  const [rfqId, setRfqId] = useState(initial || "");
  useEffect(() => {
    if (!rfqId && comparableRfqIds.length) setRfqId(initial || comparableRfqIds[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotesRes]);

  // Fetch the structured comparison from the backend whenever the RFQ changes.
  const { data: cmpRes, loading, refetch } = useFetch(
    () => (rfqId ? quotationsApi.compare(rfqId) : Promise.resolve(null)),
    [rfqId],
    { key: "quotations:compare" }
  );
  const cmp = cmpRes?.data;
  const vendors = cmp?.vendors || [];
  const itemNames = cmp?.itemNames || [];
  const summary = cmp?.summary || {};
  const [awarding, setAwarding] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  // --- AI award recommendation ---
  const aiEnabled = useAiEnabled();
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  useEffect(() => setInsight(""), [rfqId]); // clear when switching RFQ

  const getInsight = async () => {
    setInsightLoading(true);
    try {
      const { data } = await aiApi.comparisonInsight(rfqId);
      setInsight(data.insight);
    } catch (e) {
      setInsight("");
      toast.error(e.message || "Could not generate a recommendation.");
    } finally {
      setInsightLoading(false);
    }
  };

  const award = async (quotationId) => {
    const winner = vendors.find((v) => v.quotationId === quotationId || v.id === quotationId);
    const ok = await confirm({
      title: "Award this quotation?",
      message: `${
        winner?.vendor ? `${winner.vendor} wins this RFQ. ` : ""
      }The remaining quotations will be closed and a draft purchase order created.`,
      confirmLabel: "Award",
    });
    if (!ok) return;

    setAwarding(true);
    try {
      await quotationsApi.award(quotationId);
      await refetch();
      toast.success("Quotation awarded — draft PO created.");
    } catch (e) {
      toast.error(e.message || "Could not award quotation.");
    } finally {
      setAwarding(false);
    }
  };

  const awardedQuote = vendors.find((v) => v.status === "Awarded");

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/quotations" className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-brand mb-4">
        <ArrowLeft size={16} /> Back to quotations
      </Link>

      <PageHeader title="Compare quotations" subtitle="Side-by-side analysis to pick the best vendor">
        <select
          value={rfqId}
          onChange={(e) => setRfqId(e.target.value)}
          className="px-3.5 py-2.5 bg-surface border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {comparableRfqIds.length === 0 && <option value="">No RFQs</option>}
          {comparableRfqIds.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </PageHeader>

      {cmp?.rfq?.title && <p className="-mt-4 mb-6 text-sm text-fg-muted">{cmp.rfq.title}</p>}

      {loading ? (
        <Card><div className="flex items-center justify-center gap-2 py-16 text-fg-muted"><Loader2 size={18} className="animate-spin" /> Loading comparison...</div></Card>
      ) : vendors.length === 0 ? (
        <Card><EmptyState icon={GitCompare} title="No quotes to compare" /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-4 text-left text-xs font-semibold text-fg-muted uppercase">Criteria</th>
                {vendors.map((v) => (
                  <th key={v.quotationId} className="px-5 py-4 text-left">
                    <span className="block font-bold text-fg">{v.vendor}</span>
                    <span className="block text-xs font-normal text-fg-muted">{v.quotationId}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itemNames.map((name) => (
                <tr key={name}>
                  <td className="px-5 py-3 text-fg-muted">{name}</td>
                  {vendors.map((v) => {
                    const price = v.prices?.[name];
                    return (
                      <td key={v.quotationId} className="px-5 py-3 text-fg">
                        {price != null ? formatINR(price) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}

              <tr className="bg-surface-2/60">
                <td className="px-5 py-3.5 font-semibold text-fg">Total</td>
                {vendors.map((v) => (
                  <td key={v.quotationId} className="px-5 py-3.5">
                    <span className={cn("font-bold", v.amount === summary.lowestAmount ? "text-emerald-600" : "text-fg")}>
                      {formatINR(v.amount)}
                      {v.amount === summary.lowestAmount && v.amount > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><Trophy size={11} /> Lowest</span>
                      )}
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="px-5 py-3.5 font-semibold text-fg">Delivery</td>
                {vendors.map((v) => (
                  <td key={v.quotationId} className="px-5 py-3.5">
                    <span className={cn("font-medium", v.deliveryDays === summary.fastestDeliveryDays ? "text-emerald-600" : "text-fg")}>
                      {v.deliveryDays} days
                      {v.deliveryDays === summary.fastestDeliveryDays && <Truck size={13} className="inline ml-1.5 -mt-0.5" />}
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="px-5 py-4"></td>
                {vendors.map((v) => (
                  <td key={v.quotationId} className="px-5 py-4">
                    {v.status === "Awarded" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check size={16} /> Awarded</span>
                    ) : v.status === "Rejected" ? (
                      <span className="text-sm text-fg-muted">Rejected</span>
                    ) : (
                      <button
                        onClick={() => award(v.quotationId)}
                        disabled={awarding || Boolean(awardedQuote)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Award
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {aiEnabled && vendors.length > 0 && (
        <div className="mt-5">
          {insight ? (
            <AiPanel title="AI award recommendation">
              <p className="whitespace-pre-line">{insight}</p>
            </AiPanel>
          ) : insightLoading ? (
            <AiPanel title="AI award recommendation">
              <AiThinking label="Analysing the quotes…" />
            </AiPanel>
          ) : (
            <AiButton onClick={getInsight} loading={insightLoading}>
              Get AI recommendation
            </AiButton>
          )}
        </div>
      )}

      {awardedQuote && (
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
          <p className="text-sm text-emerald-800 font-medium">
            {awardedQuote.vendor} selected — a draft purchase order was created.
          </p>
          <button onClick={() => router.push("/purchase-orders")} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition">
            View purchase orders
          </button>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto py-16 text-center text-fg-muted">Loading…</div>}>
      <CompareInner />
    </Suspense>
  );
}
