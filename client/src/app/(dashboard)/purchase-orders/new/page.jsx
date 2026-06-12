"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { purchaseOrdersApi } from "@/lib/api";
import { useVendors } from "@/hooks/useVendors";
import { formatINR } from "@/lib/format";
import { PageHeader, Card, PrimaryButton, GhostButton } from "@/components/ui/kit";

const inputCls =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

function NewPurchaseOrderInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { vendors } = useVendors();
  const [vendorId, setVendorId] = useState(params.get("vendor") || "");
  const [priority, setPriority] = useState("medium");
  const [delivery, setDelivery] = useState("");
  const [items, setItems] = useState([{ name: "", qty: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Default the vendor select to the first vendor once they load.
  const effectiveVendorId = vendorId || vendors[0]?.id || "";

  const setItem = (i, k, v) => setItems((it) => it.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addItem = () => setItems((it) => [...it, { name: "", qty: 1, unitPrice: 0 }]);
  const removeItem = (i) => setItems((it) => it.filter((_, idx) => idx !== i));

  const total = items.reduce((s, it) => s + Number(it.qty) * Number(it.unitPrice), 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!effectiveVendorId) return setError("Select a vendor");
    if (!delivery) return setError("Pick a delivery date");
    if (items.some((it) => !it.name.trim() || Number(it.unitPrice) <= 0))
      return setError("Each item needs a name and a price");

    const vendor = vendors.find((v) => v.id === effectiveVendorId);
    setSaving(true);
    try {
      const res = await purchaseOrdersApi.create({
        vendorId: effectiveVendorId,
        vendor: vendor?.name || "",
        priority,
        delivery,
        status: "Draft",
        items: items.map((it) => ({ name: it.name, qty: Number(it.qty), unitPrice: Number(it.unitPrice) })),
      });
      router.push(`/purchase-orders/${res.data.id}`);
    } catch (e2) {
      setError(e2.message || "Could not create purchase order.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/purchase-orders" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4"><ArrowLeft size={16} /> Back to POs</Link>
      <PageHeader title="New purchase order" subtitle="Raise a PO against a vendor." />

      <Card className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor</label>
              <select value={effectiveVendorId} onChange={(e) => setVendorId(e.target.value)} className={inputCls}>
                {vendors.length === 0 && <option value="">No vendors</option>}
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Delivery date</label>
              <input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Line items</label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={it.name} onChange={(e) => setItem(i, "name", e.target.value)} placeholder="Item description" className={`${inputCls} flex-1`} />
                  <input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} className={`${inputCls} w-20`} />
                  <input type="number" min="0" value={it.unitPrice} onChange={(e) => setItem(i, "unitPrice", e.target.value)} placeholder="Price" className={`${inputCls} w-28`} />
                  <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="p-2.5 text-slate-400 hover:text-red-600 disabled:opacity-30"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"><Plus size={16} /> Add item</button>
          </div>

          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-5 py-4">
            <span className="text-sm font-medium text-slate-600">Order total</span>
            <span className="text-xl font-bold text-blue-600">{formatINR(total)}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <GhostButton href="/purchase-orders">Cancel</GhostButton>
            <PrimaryButton type="submit">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Check size={16} /> Create PO</>}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function NewPurchaseOrderPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto py-16 text-center text-slate-400">Loading…</div>}>
      <NewPurchaseOrderInner />
    </Suspense>
  );
}
