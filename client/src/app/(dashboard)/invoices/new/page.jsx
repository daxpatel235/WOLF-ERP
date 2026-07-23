"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Check, Loader2, Upload, X } from "lucide-react";
import { invoicesApi, aiApi } from "@/lib/api";
import { useVendors } from "@/hooks/useVendors";
import { formatINR } from "@/lib/format";
import { PageHeader, Card, PrimaryButton, GhostButton } from "@/components/ui/kit";
import { useAiEnabled, AiButton, AiThinking } from "@/components/ui/ai";

const inputCls =
  "w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-sm placeholder:text-fg-muted focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";
const GST_RATE = 0.18;

function NewInvoiceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const poId = params.get("po") || "";
  const { vendors } = useVendors();
  const [vendorId, setVendorId] = useState("");
  const [due, setDue] = useState("");
  const [items, setItems] = useState([{ name: "", qty: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveVendorId = vendorId || vendors[0]?.id || "";

  // --- AI document extraction (paste text or upload a scan) ---
  const aiEnabled = useAiEnabled();
  const [showExtract, setShowExtract] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [image, setImage] = useState(null); // { media_type, data, name }
  const [extracting, setExtracting] = useState(false);

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const data = dataUrl.split(",")[1]; // strip "data:...;base64,"
      setImage({ media_type: file.type, data, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const runExtract = async () => {
    if (!pasteText.trim() && !image) return setError("Paste invoice text or attach an image first");
    setExtracting(true);
    setError("");
    try {
      const body = { kind: "invoice" };
      if (pasteText.trim()) body.text = pasteText;
      if (image) body.image = { media_type: image.media_type, data: image.data };
      const { data } = await aiApi.extract(body);

      // Match the extracted vendor name to a known vendor (best effort).
      if (data.vendor) {
        const match = vendors.find((v) => v.name.toLowerCase().includes(String(data.vendor).toLowerCase()) || String(data.vendor).toLowerCase().includes(v.name.toLowerCase()));
        if (match) setVendorId(match.id);
      }
      if (data.items?.length) {
        setItems(data.items.map((it) => ({ name: it.name || "", qty: Number(it.qty) || 1, unitPrice: Number(it.unitPrice) || 0 })));
      }
      setShowExtract(false);
      setPasteText("");
      setImage(null);
    } catch (e) {
      setError(e.message || "Could not extract the document.");
    } finally {
      setExtracting(false);
    }
  };

  const setItem = (i, k, v) => setItems((it) => it.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addItem = () => setItems((it) => [...it, { name: "", qty: 1, unitPrice: 0 }]);
  const removeItem = (i) => setItems((it) => it.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.unitPrice), 0);
  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!effectiveVendorId) return setError("Select a vendor");
    if (!due) return setError("Pick a due date");
    if (items.some((it) => !it.name.trim() || Number(it.unitPrice) <= 0))
      return setError("Each item needs a name and a price");

    const vendor = vendors.find((v) => v.id === effectiveVendorId);
    setSaving(true);
    try {
      const res = await invoicesApi.create({
        vendorId: effectiveVendorId,
        vendor: vendor?.name || "",
        poId: poId || undefined,
        due,
        status: "Draft",
        items: items.map((it) => ({ name: it.name, qty: Number(it.qty), unitPrice: Number(it.unitPrice) })),
      });
      router.push(`/invoices/${res.data.id}`);
    } catch (e2) {
      setError(e2.message || "Could not create invoice.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted hover:text-brand mb-4"><ArrowLeft size={16} /> Back to invoices</Link>
      <PageHeader title="Create invoice" subtitle={poId ? `Billing for ${poId}` : "Generate an invoice with auto GST calculation."}>
        {aiEnabled && !showExtract && (
          <AiButton onClick={() => setShowExtract(true)}>Extract from document</AiButton>
        )}
      </PageHeader>

      {aiEnabled && showExtract && (
        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 sm:p-5 mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-semibold text-violet-900">Extract invoice with AI</span>
            <button onClick={() => setShowExtract(false)} className="text-fg-muted hover:text-fg-muted"><X size={16} /></button>
          </div>
          <p className="text-xs text-fg-muted mb-3">
            Paste the vendor&apos;s invoice text or upload a scan/photo — AI fills the vendor and line items for you to review.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            placeholder="Paste invoice text here…"
            className={`${inputCls} resize-y`}
          />
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <label className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-fg bg-surface border border-border rounded-lg hover:bg-surface-2 cursor-pointer">
              <Upload size={15} /> {image ? "Change image" : "Upload image"}
              <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            </label>
            {image && <span className="text-xs text-fg-muted truncate max-w-[180px]">{image.name}</span>}
            <div className="flex-1" />
            {extracting ? (
              <AiThinking label="Reading the document…" />
            ) : (
              <AiButton onClick={runExtract}>Extract</AiButton>
            )}
          </div>
        </div>
      )}

      <Card className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-fg mb-1.5">Vendor</label>
              <select value={effectiveVendorId} onChange={(e) => setVendorId(e.target.value)} className={inputCls}>
                {vendors.length === 0 && <option value="">No vendors</option>}
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg mb-1.5">Due date</label>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg mb-2">Line items</label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={it.name} onChange={(e) => setItem(i, "name", e.target.value)} placeholder="Item / service" className={`${inputCls} flex-1`} />
                  <input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} className={`${inputCls} w-20`} />
                  <input type="number" min="0" value={it.unitPrice} onChange={(e) => setItem(i, "unitPrice", e.target.value)} placeholder="Price" className={`${inputCls} w-28`} />
                  <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="p-2.5 text-fg-muted hover:text-red-600 disabled:opacity-30"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-700"><Plus size={16} /> Add item</button>
          </div>

          <div className="bg-surface-2 rounded-xl px-5 py-4 space-y-2 text-sm">
            <div className="flex justify-between text-fg-muted"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between text-fg-muted"><span>GST (18%)</span><span>{formatINR(gst)}</span></div>
            <div className="flex justify-between pt-2 border-t border-border font-bold text-fg"><span>Total</span><span className="text-brand">{formatINR(total)}</span></div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <GhostButton href="/invoices">Cancel</GhostButton>
            <PrimaryButton type="submit">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Check size={16} /> Create invoice</>}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto py-16 text-center text-fg-muted">Loading…</div>}>
      <NewInvoiceInner />
    </Suspense>
  );
}
