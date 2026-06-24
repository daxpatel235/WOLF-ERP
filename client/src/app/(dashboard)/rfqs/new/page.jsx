"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Loader2 } from "lucide-react";
import { rfqsApi, aiApi } from "@/lib/api";
import { useVendors } from "@/hooks/useVendors";
import { cn } from "@/lib/format";
import { PageHeader, Card, PrimaryButton, GhostButton } from "@/components/ui/kit";
import { useAiEnabled, AiButton } from "@/components/ui/ai";

const STEPS = ["Details", "Line items", "Vendors"];

export default function NewRfqPage() {
  const router = useRouter();
  const { vendors } = useVendors();
  const aiEnabled = useAiEnabled();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [details, setDetails] = useState({ title: "", category: "Office Furniture", due: "" });
  const [items, setItems] = useState([{ name: "", qty: 1, unit: "pcs" }]);
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // --- AI drafter: plain-English request → filled form ---
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);

  const draftWithAi = async () => {
    if (!aiPrompt.trim()) return setError("Describe what you need to procure first");
    setAiDrafting(true);
    setError("");
    try {
      const { data } = await aiApi.draftRfq(aiPrompt);
      const due = new Date(Date.now() + (data.suggestedDueInDays || 14) * 86400000)
        .toISOString()
        .slice(0, 10);
      setDetails({ title: data.title || "", category: data.category || "Office Furniture", due });
      setItems(
        (data.items?.length ? data.items : [{ name: "", qty: 1, unit: "pcs" }]).map((it) => ({
          name: it.name || "",
          qty: it.qty || 1,
          unit: it.unit || "pcs",
        }))
      );
      setNotes(data.notes || "");
    } catch (e) {
      setError(e.message || "Could not draft the RFQ. Try again.");
    } finally {
      setAiDrafting(false);
    }
  };

  const addItem = () => setItems((it) => [...it, { name: "", qty: 1, unit: "pcs" }]);
  const removeItem = (i) => setItems((it) => it.filter((_, idx) => idx !== i));
  const setItem = (i, k, v) => setItems((it) => it.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const toggleVendor = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const next = () => {
    setError("");
    if (step === 0) {
      if (!details.title.trim()) return setError("RFQ title is required");
      if (!details.due) return setError("Pick a response deadline");
    }
    if (step === 1 && items.some((i) => !i.name.trim())) return setError("Every line item needs a name");
    if (step === 2 && selected.length === 0) return setError("Invite at least one vendor");
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else publish();
  };

  const publish = async () => {
    setSaving(true);
    setError("");
    try {
      // Create + publish in a single request — the server publishes and emails
      // the invited vendors in the background, so there's no second round-trip.
      const res = await rfqsApi.create({
        title: details.title,
        category: details.category,
        due: details.due,
        items: items.map((it) => ({ name: it.name, qty: Number(it.qty), unit: it.unit })),
        invitedVendors: selected,
        notes,
        publish: true,
      });
      router.push(`/rfqs/${res.data.id}`);
    } catch (e) {
      setError(e.message || "Could not create the RFQ.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/rfqs" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4">
        <ArrowLeft size={16} /> Back to RFQs
      </Link>
      <PageHeader title="Create RFQ" subtitle="Collect comparable quotes from multiple vendors." />

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
              i < step ? "bg-emerald-500 text-white" : i === step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500")}>
              {i < step ? <Check size={14} /> : i + 1}
            </span>
            <span className={cn("text-sm font-medium", i === step ? "text-slate-900" : "text-slate-400")}>{s}</span>
            {i < STEPS.length - 1 && <span className="flex-1 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      <Card className="p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            {aiEnabled && (
              <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4">
                <label className="block text-sm font-semibold text-violet-900 mb-1.5">
                  Draft with AI
                </label>
                <p className="text-xs text-slate-500 mb-2.5">
                  Describe what you need in plain English — AI fills the title, items and timeline.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && draftWithAi()}
                    placeholder="e.g. 20 ergonomic office chairs and 10 standing desks for the new floor"
                    className={inputCls}
                  />
                  <AiButton onClick={draftWithAi} loading={aiDrafting} className="shrink-0">
                    {aiDrafting ? "Drafting…" : "Draft"}
                  </AiButton>
                </div>
              </div>
            )}
            <Field label="RFQ title">
              <input value={details.title} onChange={(e) => setDetails({ ...details, title: e.target.value })}
                placeholder="e.g. Office furniture — 3rd floor refit" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Category">
                <select value={details.category} onChange={(e) => setDetails({ ...details, category: e.target.value })} className={inputCls}>
                  {["Office Furniture", "Electronics", "Raw Materials", "IT Services", "Travel", "Medical"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Response deadline">
                <input type="date" value={details.due} onChange={(e) => setDetails({ ...details, due: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label={i === 0 ? "Item" : ""} className="flex-1">
                  <input value={it.name} onChange={(e) => setItem(i, "name", e.target.value)} placeholder="Item description" className={inputCls} />
                </Field>
                <Field label={i === 0 ? "Qty" : ""} className="w-20">
                  <input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} className={inputCls} />
                </Field>
                <Field label={i === 0 ? "Unit" : ""} className="w-24">
                  <input value={it.unit} onChange={(e) => setItem(i, "unit", e.target.value)} className={inputCls} />
                </Field>
                <button onClick={() => removeItem(i)} disabled={items.length === 1}
                  className="p-2.5 text-slate-400 hover:text-red-600 disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button onClick={addItem} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              <Plus size={16} /> Add line item
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vendors.map((v) => {
              const on = selected.includes(v.id);
              return (
                <button key={v.id} onClick={() => toggleVendor(v.id)}
                  className={cn("flex items-center gap-3 p-3 rounded-xl border text-left transition",
                    on ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300")}>
                  <span className={cn("w-5 h-5 rounded-md flex items-center justify-center", on ? "bg-blue-600" : "border border-slate-300")}>
                    {on && <Check size={13} className="text-white" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{v.name}</span>
                    <span className="block text-xs text-slate-400">{v.category}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100">
          <GhostButton onClick={() => (step === 0 ? router.push("/rfqs") : setStep((s) => s - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </GhostButton>
          <PrimaryButton onClick={next}>
            {saving ? <><Loader2 size={16} className="animate-spin" /> Publishing...</>
              : step === STEPS.length - 1 ? <><Check size={16} /> Publish RFQ</>
              : <>Continue <ArrowRight size={16} /></>}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      {children}
    </div>
  );
}
