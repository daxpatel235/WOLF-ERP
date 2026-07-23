import Link from "next/link";
import { FileText, ShieldCheck, Sparkles } from "lucide-react";

export const metadata = {
  title: "Sign in - Wolf ERP",
};

// Two-column auth shell: a dark brand panel (the "slate rail" identity, hidden
// on mobile) beside the form. Login / register / password pages just render
// their contents into the card on the right.
const POINTS = [
  {
    icon: FileText,
    title: "RFQ to invoice, one thread",
    body: "Raise an RFQ, compare quotations side by side, award a PO and bill it — without leaving the trail.",
  },
  {
    icon: ShieldCheck,
    title: "Approvals with a paper trail",
    body: "Threshold-based sign-off, priority queues, and an activity log that records every decision.",
  },
  {
    icon: Sparkles,
    title: "AI that reads your data",
    body: "Draft RFQs, score vendor risk, audit invoices and summarise spend from your own records.",
  },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      {/* ---- Brand panel ---- */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-900 text-slate-100 p-12">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-brand/10 blur-3xl" />

        <Link href="/" className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wolf-icon.png"
            alt=""
            className="w-11 h-11 rounded-xl object-contain shadow-sm shadow-brand/30"
          />
          <span className="leading-tight">
            <span className="block font-bold tracking-tight text-lg">Wolf</span>
            <span className="block text-xs text-slate-400 -mt-0.5">
              Procurement ERP
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold tracking-tight leading-snug">
            Procurement that runs itself, end to end.
          </h2>
          <ul className="mt-8 space-y-5">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-slate-800 text-brand-300">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-sm text-slate-400">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} Wolf ERP. Built for teams that buy well.
        </p>
      </div>

      {/* ---- Form side ---- */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-enter">
          {/* Mobile brand lockup — the panel above is hidden below lg */}
          <Link
            href="/"
            className="lg:hidden flex items-center justify-center gap-3 mb-8"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/wolf-w.png"
              alt=""
              className="w-10 h-10 object-contain"
            />
            <span className="leading-tight text-left">
              <span className="block font-bold tracking-tight text-lg text-fg">
                Wolf
              </span>
              <span className="block text-xs text-fg-muted -mt-0.5">
                Procurement ERP
              </span>
            </span>
          </Link>

          <div className="bg-surface border border-border rounded-2xl shadow-card p-6 sm:p-8">
            {children}
          </div>

          <p className="lg:hidden text-center text-xs text-fg-muted mt-6">
            © {new Date().getFullYear()} Wolf ERP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
