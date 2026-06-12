"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, FileText, ShoppingCart, Users, Receipt, BarChart3,
  CheckCircle2, Eye, MessageSquare, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/format";

// Small capability icons per seat type
const SEAT_ICONS = {
  manager: [FileText, ShoppingCart, Users, Receipt, BarChart3],
  approver: [CheckCircle2, Eye, MessageSquare],
  collaborator: [Eye, MessageSquare],
};

const TIERS = [
  {
    name: "Starter",
    tagline: "Free limited access to Wolf ERP",
    free: true,
    cta: "Get started",
    ctaStyle: "outline",
    href: "/register",
    includes: ["Up to 10 vendors", "5 RFQs per month", "Basic approval flow", "1 manager seat"],
  },
  {
    name: "Professional",
    seats: [
      { key: "manager", name: "Manager seat", monthly: 1499, annual: 1199, credits: "Unlimited invoices/mo" },
      { key: "approver", name: "Approver seat", monthly: 999, annual: 799, credits: "500 invoices/mo" },
      { key: "collaborator", name: "Collaborator seat", monthly: 299, annual: 249, credits: "200 invoices/mo" },
    ],
    cta: "Select plan",
    ctaStyle: "primary",
    href: "/register",
    chooseTitle: "Professional",
    chooseIf: [
      "You're a professional or part of a small team",
      "Need unlimited RFQs, POs and invoices for a single team",
      "Want OCR invoice capture and a vendor portal",
    ],
    features: ["Unlimited vendors & RFQs", "OCR invoice automation", "Multi-step approvals", "Email + vendor portal sourcing"],
  },
  {
    name: "Organization",
    popular: true,
    seats: [
      { key: "manager", name: "Manager seat", monthly: 3999, annual: 3299, credits: "Unlimited invoices/mo" },
      { key: "approver", name: "Approver seat", monthly: 1799, annual: 1499, credits: "1,000 invoices/mo" },
      { key: "collaborator", name: "Collaborator seat", monthly: 499, annual: 399, credits: "500 invoices/mo" },
    ],
    cta: "Select plan",
    ctaStyle: "primary",
    href: "/register",
    chooseTitle: "Organization",
    chooseIf: [
      "You run procurement across multiple departments",
      "Need unlimited teams and centralized vendor data",
      "Want approval rules, budgets and audit trails",
    ],
    features: ["Everything in Professional", "Departments & budgets", "Auto-approval rules", "Tally & Zoho Books sync"],
  },
  {
    name: "Enterprise",
    seats: [
      { key: "manager", name: "Manager seat", monthly: null, annual: null, credits: "Unlimited invoices/mo", custom: true },
      { key: "approver", name: "Approver seat", monthly: null, annual: null, credits: "Unlimited invoices/mo", custom: true },
      { key: "collaborator", name: "Collaborator seat", monthly: null, annual: null, credits: "Unlimited invoices/mo", custom: true },
    ],
    cta: "Contact sales",
    ctaStyle: "dark",
    href: "mailto:sales@wolferp.in",
    chooseTitle: "Enterprise",
    chooseIf: [
      "You're a large business with complex procurement",
      "Need enterprise-grade security and SSO/SCIM",
      "Want a dedicated success manager and SLAs",
    ],
    features: ["Everything in Organization", "SSO & SCIM provisioning", "Custom roles & data residency", "Dedicated support + SLA"],
  },
];

const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="bg-white">
      {/* Header */}
      <section className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Plans &amp; pricing
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            Start free, then pay per seat as your procurement team grows. Switch or cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 p-1 bg-slate-100 rounded-full">
            <button
              onClick={() => setAnnual(false)}
              className={cn("px-5 py-2 text-sm font-semibold rounded-full transition", !annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn("px-5 py-2 text-sm font-semibold rounded-full transition flex items-center gap-2", annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
            >
              Annual <span className="text-[11px] font-bold text-emerald-600">Save 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tier columns */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:divide-x divide-slate-100">
          {TIERS.map((tier) => (
            <Column key={tier.name} tier={tier} annual={annual} />
          ))}
        </div>
      </section>

      {/* Footer note */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-slate-50 rounded-2xl px-6 py-8 text-center">
          <p className="text-slate-700 font-semibold">All plans include bank-grade security, GST-ready invoicing and email support.</p>
          <p className="text-sm text-slate-500 mt-1">Prices exclusive of taxes. Annual plans billed yearly.</p>
        </div>
      </section>
    </div>
  );
}

function Column({ tier, annual }) {
  const ctaCls = {
    outline: "border border-slate-300 text-slate-900 hover:bg-slate-50",
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    dark: "bg-slate-900 text-white hover:bg-slate-800",
  }[tier.ctaStyle];

  return (
    <div className={cn("px-6 py-8 flex flex-col", tier.popular && "bg-blue-50/40")}>
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{tier.name}</h2>
        {tier.popular && (
          <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Popular</span>
        )}
      </div>

      <p className="text-sm text-slate-500 mt-1 min-h-[20px]">
        {tier.free ? "Free forever" : annual ? "Billed annually" : "Billed monthly"}
      </p>

      {/* Body: free includes OR seat rows */}
      <div className="mt-6 flex-1">
        {tier.free ? (
          <>
            <p className="text-3xl font-extrabold text-slate-900 mb-2">Free</p>
            <p className="text-sm text-slate-500">{tier.tagline}</p>
          </>
        ) : (
          <div className="space-y-5">
            {tier.seats.map((seat) => (
              <SeatRow key={seat.key} seat={seat} annual={annual} popular={tier.popular} />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        href={tier.href}
        className={cn("mt-7 w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition", ctaCls)}
      >
        {tier.cta}
        {tier.ctaStyle !== "outline" && <ArrowRight size={16} />}
      </Link>

      {/* Includes (Starter) */}
      {tier.includes && (
        <div className="mt-7">
          <p className="text-sm font-semibold text-slate-900 mb-3">Includes:</p>
          <ul className="space-y-2.5">
            {tier.includes.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <Check size={16} className="text-slate-400 shrink-0 mt-0.5" /> {i}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Choose if + key features */}
      {tier.chooseIf && (
        <div className="mt-7 space-y-6">
          <div>
            <p className="text-sm text-slate-700">
              Choose <span className="font-bold">{tier.chooseTitle}</span> if you:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside marker:text-slate-300">
              {tier.chooseIf.map((c) => (
                <li key={c} className="text-sm text-slate-600">{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-3">Key features:</p>
            <ul className="space-y-2.5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SeatRow({ seat, annual, popular }) {
  const icons = SEAT_ICONS[seat.key] || [];
  const price = annual ? seat.annual : seat.monthly;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-bold text-slate-900">{seat.name}</span>
        {seat.custom ? (
          <span className="text-sm font-bold text-slate-900">Custom</span>
        ) : (
          <span className="text-lg font-extrabold text-slate-900">
            {inr(price)}<span className="text-sm font-medium text-slate-400">/mo</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        {icons.map((Icon, i) => (
          <span key={i} className={cn("w-6 h-6 rounded-md flex items-center justify-center", popular ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500")}>
            <Icon size={13} />
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-2">+ {seat.credits}</p>
    </div>
  );
}
