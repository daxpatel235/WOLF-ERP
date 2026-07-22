"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, Package, GitCompare, FileText, Loader2, Check, Send } from "lucide-react";
import { rfqsApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatDate, formatINR } from "@/lib/format";
import { PageHeader, Card, Badge, PrimaryButton, GhostButton, EmptyState } from "@/components/ui/kit";

export default function RfqDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(() => rfqsApi.get(id), [id], { key: "rfq" });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Loading RFQ...
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/rfqs" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back to RFQs</Link>
        <Card className="p-6"><EmptyState icon={FileText} title="RFQ not found" hint={error?.message || `No RFQ with id ${id}`} /></Card>
      </div>
    );
  }

  const rfq = data.data;
  const quotes = data.quotations || [];

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/rfqs" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back to RFQs</Link>

      <PageHeader title={rfq.title} subtitle={`${rfq.id} · ${rfq.category}`}>
        <Badge status={rfq.status} />
        {quotes.length > 1 && (
          <GhostButton href={`/quotations/compare?rfq=${rfq.id}`}>
            <GitCompare size={16} /> Compare quotes
          </GhostButton>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-base font-bold text-slate-900 px-6 py-4 border-b border-slate-100">Requested items</h2>
            <div className="divide-y divide-slate-100">
              {rfq.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-3.5">
                  <span className="flex items-center gap-3">
                    <Package size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-800">{it.name}</span>
                  </span>
                  <span className="text-sm text-slate-500">{it.qty} {it.unit}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Quotes received ({quotes.length})</h2>
            </div>
            {quotes.length === 0 ? (
              <div className="px-6 py-8 text-sm text-slate-400 text-center">No quotes submitted yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {quotes.map((q) => (
                  <Link key={q.id} href={`/quotations/${q.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{q.vendor}</p>
                      <p className="text-xs text-slate-400">Delivers in {q.deliveryDays} days · valid till {formatDate(q.validTill)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-slate-900">{formatINR(q.amount)}</span>
                      <Badge status={q.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 h-fit space-y-4">
          <Meta icon={Calendar} label="Created" value={formatDate(rfq.created)} />
          <Meta icon={Calendar} label="Response deadline" value={formatDate(rfq.due)} />
          <Meta icon={Users} label="Vendors invited" value={rfq.invited} />
          <Meta icon={FileText} label="Quotes received" value={rfq.received} />
          <div className="pt-4 border-t border-slate-100">
            <SendReminderButton rfqId={rfq.id} invited={rfq.invited} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// Re-sends invitations to the RFQ's invited vendors via the publish endpoint.
function SendReminderButton({ rfqId, invited }) {
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  const send = async () => {
    setState("sending");
    setError("");
    try {
      await rfqsApi.publish(rfqId);
      setState("sent");
      setTimeout(() => setState("idle"), 4000);
    } catch (e) {
      setError(e.message || "Could not send reminder.");
      setState("idle");
    }
  };

  return (
    <>
      <PrimaryButton className="w-full" onClick={send}>
        {state === "sending" ? (
          <><Loader2 size={16} className="animate-spin" /> Sending…</>
        ) : state === "sent" ? (
          <><Check size={16} /> Reminder sent</>
        ) : (
          <><Send size={16} /> Send reminder</>
        )}
      </PrimaryButton>
      <p className="mt-2 text-xs text-slate-400 text-center">
        {error ? <span className="text-red-600">{error}</span> : `Re-invites ${invited || 0} vendor(s) to quote.`}
      </p>
    </>
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
