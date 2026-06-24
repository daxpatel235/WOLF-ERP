import Link from "next/link";

const COLUMNS = [
  {
    title: "Platform",
    links: ["Vendor Payments", "Invoice Automation", "Approvals", "Purchase Orders", "Reporting"],
  },
  {
    title: "Solutions",
    links: ["Procurement Teams", "Finance", "Enterprises", "SMBs", "Vendors"],
  },
  {
    title: "Resources",
    links: ["Docs", "Blog", "Guides", "API Reference", "Support"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Partners", "Contact", "Pricing"],
  },
];

// Resolve a footer label to a real destination so no link is a dead "#".
function destFor(label) {
  const map = {
    Pricing: "/pricing",
    "Invoice Automation": "/#invoices",
    Platform: "/#platform",
    Reporting: "/#platform",
    Support: "mailto:support@wolferp.in",
    Contact: "mailto:hello@wolferp.in",
    "API Reference": "https://github.com/daxpatel235/WOLF-ERP",
    Docs: "https://github.com/daxpatel235/WOLF-ERP",
  };
  return map[label] || "/register";
}

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wolf-icon.png" alt="Wolf ERP" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-2xl font-extrabold tracking-tight text-white italic">
                Wolf
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-xs">
              Track invoices, pay vendors, and close your books — all on one
              procurement platform built for modern teams.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href={destFor(link)} className="text-sm text-slate-400 hover:text-blue-400 transition">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Wolf ERP. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <Link href="/pricing" className="hover:text-slate-300 transition">Pricing</Link>
            <Link href="/terms" className="hover:text-slate-300 transition">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-300 transition">Privacy</Link>
            <Link href="/login" className="hover:text-slate-300 transition">Login</Link>
            <Link href="/register" className="hover:text-slate-300 transition">Sign up</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
