"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, Phone, MapPin, FileText, Star, ShoppingCart, Receipt, Loader2, ShieldAlert } from "lucide-react";
import { vendorsApi, aiApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import { formatINR, formatDate, cn } from "@/lib/format";
import { PageHeader, Card, Badge, PrimaryButton, GhostButton, EmptyState } from "@/components/ui/kit";
import { useAiEnabled, AiButton, AiThinking, levelClass } from "@/components/ui/ai";

export default function VendorDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch(() => vendorsApi.get(id), [id], { key: "vendor" });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 py-24 text-fg-muted">
        <Loader2 size={18} className="animate-spin" /> Loading vendor...
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/vendors" className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-brand mb-4">
          <ArrowLeft size={16} /> Back to vendors
        </Link>
        <Card className="p-6">
          <EmptyState icon={FileText} title="Vendor not found" hint={error?.message || `No vendor with id ${id}`} />
        </Card>
      </div>
    );
  }

  const vendor = data.data;
  const pos = data.purchaseOrders || [];
  const invs = data.invoices || [];

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/vendors" className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-brand mb-4">
        <ArrowLeft size={16} /> Back to vendors
      </Link>

      <PageHeader title={vendor.name} subtitle={`${vendor.id} · ${vendor.category}`}>
        <GhostButton href={`/rfqs/new?vendor=${vendor.id}`}>
          <FileText size={16} /> Invite to RFQ
        </GhostButton>
        <Link href={`/purchase-orders/new?vendor=${vendor.id}`}>
          <PrimaryButton>
            <ShoppingCart size={16} /> Create PO
          </PrimaryButton>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card className="p-6 lg:col-span-1 h-fit">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-lg">
              {vendor.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <div>
              <Badge status={vendor.status} />
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-fg">
                <Star size={14} className="text-amber-400 fill-amber-400" /> {vendor.rating} rating
              </p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <Info icon={Mail} label="Email" value={vendor.email} />
            <Info icon={Phone} label="Phone" value={vendor.phone} />
            <Info icon={MapPin} label="Location" value={vendor.location} />
            <Info icon={FileText} label="GSTIN" value={vendor.gstin} />
          </dl>
        </Card>

        {/* Stats + history */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Total Orders" value={vendor.orders} icon={ShoppingCart} />
            <Stat label="Total Spend" value={formatINR(vendor.spend)} icon={Receipt} />
          </div>

          <VendorRisk vendorId={vendor.id} />

          <Card>
            <SectionTitle title="Purchase Orders" />
            <HistoryTable rows={pos} type="po" />
          </Card>

          <Card>
            <SectionTitle title="Invoices" />
            <HistoryTable rows={invs} type="invoice" />
          </Card>
        </div>
      </div>
    </div>
  );
}

// On-demand AI risk assessment for a vendor.
function VendorRisk({ vendorId }) {
  const aiEnabled = useAiEnabled();
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!aiEnabled) return null;

  const assess = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await aiApi.vendorRisk(vendorId);
      setRisk(data);
    } catch (e) {
      setError(e.message || "Could not assess this vendor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-violet-900">
          <ShieldAlert size={18} /> AI risk assessment
        </h2>
        {risk && (
          <span className={cn("inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full uppercase", levelClass(risk.level))}>
            {risk.level} · {risk.score}/100
          </span>
        )}
      </div>

      {loading ? (
        <AiThinking label="Analysing vendor history…" />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !risk ? (
        <div>
          <p className="text-sm text-fg-muted mb-3">Score this vendor&apos;s reliability from their quotes, orders, invoices and rating.</p>
          <AiButton onClick={assess}>Assess risk</AiButton>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-fg leading-relaxed">{risk.rationale}</p>
          {risk.signals?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-fg-muted uppercase mb-1.5">Signals</p>
              <ul className="space-y-1">
                {risk.signals.map((s, i) => (
                  <li key={i} className="text-sm text-fg flex gap-2"><span className="text-violet-400">•</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {risk.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-fg-muted uppercase mb-1.5">Recommendations</p>
              <ul className="space-y-1">
                {risk.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-fg flex gap-2"><span className="text-emerald-500">✓</span>{r}</li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={assess} className="text-xs font-semibold text-violet-700 hover:text-violet-900">Re-assess</button>
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-fg-muted mt-0.5" />
      <div>
        <dt className="text-xs text-fg-muted">{label}</dt>
        <dd className="text-fg font-medium">{value}</dd>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <Icon size={18} className="text-brand mb-3" />
      <p className="text-2xl font-bold text-fg">{value}</p>
      <p className="text-sm text-fg-muted">{label}</p>
    </div>
  );
}

function SectionTitle({ title }) {
  return <h2 className="text-base font-bold text-fg px-6 py-4 border-b border-border">{title}</h2>;
}

function HistoryTable({ rows, type }) {
  if (!rows.length) return <div className="px-6 py-8 text-sm text-fg-muted text-center">No records yet.</div>;
  return (
    <div className="divide-y divide-border">
      {rows.map((r) => (
        <Link
          key={r.id}
          href={type === "po" ? `/purchase-orders/${r.id}` : `/invoices/${r.id}`}
          className="flex items-center justify-between px-6 py-3.5 hover:bg-surface-2 transition"
        >
          <div>
            <p className="text-sm font-semibold text-fg">{r.id}</p>
            <p className="text-xs text-fg-muted">{formatDate(r.created || r.issued)}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-fg">{formatINR(r.amount)}</span>
            <Badge status={r.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
