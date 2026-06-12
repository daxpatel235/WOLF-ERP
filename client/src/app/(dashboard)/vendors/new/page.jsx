"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, AlertCircle } from "lucide-react";
import { PageHeader, Card, PrimaryButton, GhostButton } from "@/components/ui/kit";
import { vendorsApi } from "@/lib/api";

const CATEGORIES = ["Raw Materials", "IT Services", "Office Furniture", "Electronics", "Medical", "Travel", "Other"];
const FIELDS = [
  { key: "name", label: "Vendor name", placeholder: "Acme Corp", required: true },
  { key: "contact", label: "Primary contact", placeholder: "Full name", required: true },
  { key: "email", label: "Email", placeholder: "vendor@company.com", required: true, type: "email" },
  { key: "phone", label: "Phone", placeholder: "+91 ..." },
  { key: "gstin", label: "GSTIN", placeholder: "27ABCDE1234F1Z5" },
  { key: "location", label: "Location", placeholder: "City, State" },
];

export default function NewVendorPage() {
  const router = useRouter();
  const [form, setForm] = useState({ category: "Raw Materials" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
    setServerError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    FIELDS.forEach((f) => {
      if (f.required && !String(form[f.key] || "").trim()) err[f.key] = `${f.label} is required`;
    });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = "Enter a valid email";
    setErrors(err);
    if (Object.keys(err).length) return;

    setSaving(true);
    setServerError("");
    try {
      await vendorsApi.create({ ...form, status: form.status || "Active" });
      router.push("/vendors");
    } catch (e2) {
      if (e2.errors) setErrors((prev) => ({ ...prev, ...e2.errors }));
      setServerError(e2.message || "Could not save vendor.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/vendors" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-4">
        <ArrowLeft size={16} /> Back to vendors
      </Link>

      <PageHeader title="Add vendor" subtitle="Register a new supplier in your network." />

      <Card className="p-6 sm:p-8">
        {serverError && (
          <div className="flex items-center gap-2 p-3 mb-5 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
            <AlertCircle size={16} /> {serverError}
          </div>
        )}
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.key === "name" ? "sm:col-span-2" : ""}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={f.type || "text"}
                  value={form[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                    errors[f.key] ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />
                {errors[f.key] && <p className="text-xs text-red-600 mt-1">{errors[f.key]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <GhostButton href="/vendors">Cancel</GhostButton>
            <PrimaryButton type="submit">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> Save vendor</>}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
