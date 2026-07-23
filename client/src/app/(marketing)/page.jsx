import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Search,
  Megaphone,
  Users,
  Settings,
  FileSpreadsheet,
  ChevronRight,
  Upload,
  AlertTriangle,
  Download,
  MousePointer2,
} from "lucide-react";
import RedirectIfAuthed from "@/components/shared/RedirectIfAuthed";

/* ----------------------------------------------------------------
   HERO
-----------------------------------------------------------------*/
function Hero() {
  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{
        backgroundColor: "#eef4ff",
        backgroundImage:
          "linear-gradient(to right, rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.06) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 lg:pt-20 pb-0 text-center">
        <p className="text-base font-bold text-blue-600 mb-5">Wolf Vendor Payments</p>
        <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-extrabold leading-[1.05] tracking-tight text-fg max-w-5xl mx-auto">
          Track invoices, pay vendors, close books, &amp; more on{" "}
          <span className="text-blue-600">one platform</span>
        </h1>
        <p className="mt-6 text-lg text-fg-muted max-w-2xl mx-auto">
          Get enhanced control, speed and accuracy with vendor payments that work
          like clockwork.
        </p>
        <div className="mt-8">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg shadow-blue-600/25"
          >
            Sign Up <ArrowRight size={18} />
          </Link>
        </div>

        {/* Mockup */}
        <HeroMockup />
      </div>
    </section>
  );
}

function Avatar({ label, gradient }) {
  return (
    <div className="hidden lg:flex flex-col items-center">
      <p className="text-xl font-semibold text-fg mb-3">{label}</p>
      <div
        className={`w-32 h-40 rounded-2xl bg-gradient-to-br ${gradient} flex items-end justify-center shadow-sm`}
      >
        <div className="w-20 h-20 rounded-full bg-white/30 mb-5 backdrop-blur" />
      </div>
    </div>
  );
}

function HeroMockup() {
  const invoices = [
    { id: "94873823", name: "Advaith B.", amount: "₹8,89,000", status: "Pending" },
    { id: "38983484", name: "Soetlana S.", amount: "₹5,90,763", status: "Processed" },
    { id: "84823479", name: "Sonia Kapoor", amount: "₹1,00,000", status: "Processed" },
    { id: "48474549", name: "Anisha", amount: "₹91,000", status: "Processed" },
  ];
  const menu = ["Invoices", "Advances", "TDS Payments", "Accounting", "Vendors", "Items"];

  return (
    <div className="relative mt-14 flex items-end justify-center gap-4">
      {/* Merchant */}
      <div className="relative">
        <Avatar label="Merchant" gradient="from-sky-200 to-blue-300" />
        <span className="hidden lg:block absolute -bottom-3 -right-6 px-4 py-2 bg-surface rounded-full shadow-md text-sm font-semibold text-fg">
          Payment Sent
        </span>
      </div>

      {/* App panel */}
      <div className="w-full max-w-3xl bg-surface rounded-t-2xl border border-border border-b-0 shadow-2xl shadow-blue-900/10 overflow-hidden text-left">
        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden sm:block w-44 border-r border-border p-4">
            <div className="flex items-center gap-1.5 mb-6">
              <span className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-white font-black text-xs">W</span>
              </span>
              <span className="text-lg font-extrabold italic text-fg">Wolf</span>
            </div>
            <ul className="space-y-1">
              {menu.map((m, i) => (
                <li
                  key={m}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    i === 0
                      ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600"
                      : "text-fg-muted"
                  }`}
                >
                  {m}
                </li>
              ))}
            </ul>
          </aside>

          {/* Main */}
          <div className="flex-1 p-5">
            <p className="text-sm font-semibold text-fg">
              Vendor Payments <span className="text-fg-muted font-normal">Overview</span>
            </p>
            <h3 className="text-2xl font-bold text-fg mt-1 mb-4">Hi Jasleen,</h3>

            <div className="grid sm:grid-cols-[1fr_auto] gap-4">
              {/* Invoice table */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-bold text-fg mb-3">Invoices</p>
                <div className="space-y-2.5">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 text-sm">
                      <span className="text-blue-600 font-medium w-20">{inv.id}</span>
                      <span className="text-fg-muted flex-1 truncate">{inv.name}</span>
                      <span className="text-fg font-semibold w-20 text-right">
                        {inv.amount}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full w-20 text-center ${
                          inv.status === "Pending"
                            ? "bg-surface-2 text-fg-muted"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="w-full sm:w-44 space-y-3">
                {/* Decorative mockup element — not an interactive control */}
                <div className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold" aria-hidden="true">
                  Pay Invoice <ChevronRight size={16} />
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold text-fg mb-2">Send to ERP</p>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-center py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                      Tally
                    </span>
                    <span className="flex-1 text-center py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold">
                      Zoho
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor */}
      <Avatar label="Vendor" gradient="from-emerald-200 to-green-300" />
    </div>
  );
}

/* ----------------------------------------------------------------
   INVOICE AUTOMATION
-----------------------------------------------------------------*/
function InvoiceAutomation() {
  const points = [
    "Upload invoices and auto-capture details with OCR precision",
    "Source invoices via your custom merchant email or vendor portal",
    "Configure multiple line items, tax codes, and payment terms effortlessly",
  ];
  return (
    <section id="invoices" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Invoice card */}
        <div className="relative bg-surface-2 rounded-3xl p-8 sm:p-12">
          <div className="relative max-w-sm mx-auto">
            {/* corner brackets */}
            <span className="absolute -top-3 -left-3 w-8 h-8 border-t-4 border-l-4 border-blue-600 rounded-tl" />
            <span className="absolute -bottom-3 -right-3 w-8 h-8 border-b-4 border-r-4 border-blue-600 rounded-br" />

            <InvoiceReceipt />

            <div className="mt-6 flex items-center gap-3 px-5 py-3.5 bg-surface rounded-2xl shadow-sm border border-border">
              <Loader2 size={20} className="text-blue-600 animate-spin" />
              <span className="text-base font-bold text-blue-700">
                Invoice scanning in progress
              </span>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
            Enhanced invoice automation
          </h2>
          <ul className="mt-8 space-y-5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <CheckCircle2 size={22} className="text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-lg text-fg">{p}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="mt-9 inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg shadow-blue-600/25"
          >
            Sign Up <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function InvoiceReceipt({ mail = "rahul@billme.co.in" }) {
  return (
    <div
      className="bg-surface px-7 py-8 shadow-lg shadow-slate-200/70"
      style={{
        clipPath:
          "polygon(0 2%, 4% 0, 8% 2%, 12% 0, 16% 2%, 20% 0, 24% 2%, 28% 0, 32% 2%, 36% 0, 40% 2%, 44% 0, 48% 2%, 52% 0, 56% 2%, 60% 0, 64% 2%, 68% 0, 72% 2%, 76% 0, 80% 2%, 84% 0, 88% 2%, 92% 0, 96% 2%, 100% 0, 100% 98%, 96% 100%, 92% 98%, 88% 100%, 84% 98%, 80% 100%, 76% 98%, 72% 100%, 68% 98%, 64% 100%, 60% 98%, 56% 100%, 52% 98%, 48% 100%, 44% 98%, 40% 100%, 36% 98%, 32% 100%, 28% 98%, 24% 100%, 20% 98%, 16% 100%, 12% 98%, 8% 100%, 4% 98%, 0 100%)",
      }}
    >
      <h3 className="text-xl font-extrabold text-blue-800 tracking-wide mb-5">
        TAX INVOICE
      </h3>
      <p className="text-[11px] text-fg-muted">GST TIN: 27AAACL1838J1ZG</p>
      <p className="text-[11px] text-fg-muted mb-3">CIN NO: L24240MH1952PLC008951</p>
      <p className="text-[11px] text-fg-muted">Invoice no.: 25329 002 0144147</p>
      <p className="text-[11px] text-fg-muted">Order no.: A376</p>

      <div className="my-3 h-1 bg-blue-600 rounded-full" />

      <p className="text-[11px] text-fg-muted">CUSTOMER PH: 7710000511</p>
      <p className="text-[11px] text-fg-muted">CUSTOMER MAIL: {mail}</p>
      <p className="text-[11px] text-fg-muted mb-4">CUSTOMER GST: 06AACCFS505E1Z3</p>

      <div className="border-t border-border pt-3 flex items-center justify-between">
        <span className="text-xs text-fg-muted">Total</span>
        <span className="text-xl font-bold text-blue-600">4398</span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
   BENTO FEATURE GRID
-----------------------------------------------------------------*/
function Card({ children, className = "", tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    white: "bg-surface border border-border",
  };
  return (
    <div className={`rounded-3xl p-7 ${tones[tone]} ${className}`}>{children}</div>
  );
}

function CardTitle({ children }) {
  return (
    <>
      <h3 className="text-xl font-bold text-fg">{children}</h3>
      <div className="mt-3 mb-5 border-t border-dashed border-border" />
    </>
  );
}

function FeatureGrid() {
  return (
    <section id="platform" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Col 1 */}
        <div className="space-y-5">
          <Card tone="blue">
            <CardTitle>Teams &amp; Departments</CardTitle>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Marketing", icon: Megaphone },
                { label: "HR", icon: Users },
                { label: "IT", icon: Settings },
              ].map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.label} className="bg-surface rounded-xl p-3 text-center shadow-sm">
                    <Icon size={18} className="mx-auto text-fg-muted mb-2" />
                    <p className="text-xs font-semibold text-fg">{d.label}</p>
                    <div className="mt-3 space-y-1.5">
                      <div className="h-1.5 bg-surface-2 rounded-full" />
                      <div className="h-1.5 bg-surface-2 rounded-full w-4/5 mx-auto" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card tone="white">
            <CardTitle>Partial Pay Invoices</CardTitle>
            <div className="scale-90 origin-top-left">
              <InvoiceReceipt mail="kuber@billme.co.in" />
            </div>
            <div className="flex gap-3 -mt-6 relative">
              <span className="px-5 py-2 rounded-lg bg-surface border border-border text-sm font-semibold text-fg shadow-sm">
                Pay Full
              </span>
              <span className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm">
                Pay Partial
              </span>
            </div>
          </Card>
        </div>

        {/* Col 2 */}
        <div className="space-y-5">
          <Card tone="green">
            <CardTitle>Bulk Import Vendors</CardTitle>
            <div className="bg-surface rounded-2xl p-6 flex flex-col items-center gap-4 shadow-sm">
              <span className="self-start text-xs font-semibold text-fg-muted border border-border rounded-md px-2 py-1">
                CSV File
              </span>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center rotate-3">
                <Upload size={32} className="text-white" />
              </div>
              <p className="text-sm font-bold text-emerald-600">100 Vendors CSV Uploaded</p>
            </div>
          </Card>

          <Card tone="blue">
            <CardTitle>Vendor Advance Utilisation</CardTitle>
            <div className="bg-surface rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between text-xs font-semibold text-fg-muted mb-3 pb-2 border-b border-border">
                <span>Vendor</span>
                <span>Balance</span>
              </div>
              {[
                { name: "Rahul Girish", w: "w-3/4" },
                { name: "Ranjana H", w: "w-2/3" },
                { name: "Monika Maharana", w: "w-1/2" },
              ].map((v) => (
                <div key={v.name} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-fg">{v.name}</span>
                  <div className="w-28 h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div className={`h-full bg-emerald-400 rounded-full ${v.w}`} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card tone="white">
            <CardTitle>Invoice due alerts</CardTitle>
            <div className="flex items-end gap-4">
              <div className="text-center">
                <p className="text-4xl font-extrabold text-blue-600 leading-none">
                  21<span className="text-base align-top text-fg-muted ml-1">June</span>
                </p>
              </div>
              <span className="text-4xl font-extrabold text-slate-200">22</span>
            </div>
            <div className="mt-4 bg-surface-2 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-fg-muted">Invoices Due Today</span>
                <AlertTriangle size={14} className="text-amber-500" />
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-[11px] font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">
                  182387691 <CheckCircle2 size={11} />
                </span>
                <span className="flex items-center gap-1 text-[11px] font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">
                  10884681 <CheckCircle2 size={11} />
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Col 3 */}
        <div className="space-y-5">
          <Card tone="blue">
            <CardTitle>Quick Filters and Search</CardTitle>
            <div className="relative">
              <div className="flex items-center gap-2 bg-surface rounded-xl border border-border px-4 py-2.5 shadow-sm">
                <input
                  readOnly
                  value="rah"
                  className="flex-1 text-sm text-fg outline-none bg-transparent"
                />
                <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Search size={15} className="text-white" />
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { name: "Sent to Rahul Girish", inv: "76482431", amt: "₹5468" },
                  { name: "Sent to Rahman", inv: "8998782", amt: "₹987" },
                  { name: "Sent to Rahat", inv: "9843667", amt: "₹3579" },
                ].map((r, i) => (
                  <div
                    key={r.inv}
                    className={`flex items-center gap-3 bg-surface rounded-xl px-3 py-2.5 shadow-sm ${
                      i > 0 ? "opacity-60" : ""
                    }`}
                  >
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg truncate">{r.name}</p>
                      <p className="text-[11px] text-fg-muted">Invoice no. {r.inv}</p>
                    </div>
                    <span className="text-sm font-bold text-fg">{r.amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card tone="green">
            <CardTitle>Download Invoice Report</CardTitle>
            <div className="bg-surface rounded-2xl p-5 shadow-sm relative">
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2">
                    <div className="h-2 bg-surface-2 rounded-full w-1/4" />
                    <div className="h-2 bg-surface-2 rounded-full flex-1" />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-center">
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md">
                  <Download size={16} /> Download Report
                </span>
              </div>
              <MousePointer2
                size={22}
                className="absolute bottom-3 right-6 text-blue-600 fill-blue-600"
              />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
   CTA STRIP
-----------------------------------------------------------------*/
function CtaStrip() {
  return (
    <section id="pricing" className="bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Bring order to your procurement
        </h2>
        <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
          Join teams paying vendors faster and closing books cleaner with Wolf.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg shadow-blue-600/30"
          >
            Sign Up <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            className="px-7 py-3.5 text-base font-semibold text-slate-200 border border-slate-700 hover:bg-slate-800 rounded-xl transition"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <RedirectIfAuthed />
      <Hero />
      <InvoiceAutomation />
      <FeatureGrid />
      <CtaStrip />
    </>
  );
}
