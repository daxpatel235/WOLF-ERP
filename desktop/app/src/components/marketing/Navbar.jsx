"use client";

import { useState } from "react";
import Link from "next/link";
import { Headphones, Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/constants";

// Only link to sections/pages that actually exist on the site.
const NAV_LINKS = [
  { label: "Platform", href: "/#platform" },
  { label: "Invoices", href: "/#invoices" },
  { label: "Pricing", href: "/pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();

  // Once auth has hydrated, a signed-in visitor (e.g. a "keep me signed in"
  // session that survived a restart) sees a "Dashboard" link instead of the
  // Login / Sign Up pair, so the marketing page reflects their session.
  const dashboardHref = user ? ROLE_HOME[user.role] || "/dashboard" : "/dashboard";
  const showAuthed = !loading && user;

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo + links */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wolf-w.png" alt="Wolf ERP" className="w-8 h-8 object-contain" />
            <span className="text-2xl font-extrabold tracking-tight text-fg italic">
              Wolf
            </span>
          </Link>

          <ul className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-[15px] font-medium text-fg hover:text-brand transition"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-4">
          <a
            href="mailto:support@wolferp.in"
            className="text-fg-muted hover:text-brand transition"
            aria-label="Email support"
            title="support@wolferp.in"
          >
            <Headphones size={22} />
          </a>
          <span className="flex items-center gap-1 text-fg-muted" title="Region: India">
            <span className="text-base leading-none">🇮🇳</span>
          </span>
          {showAuthed ? (
            <Link
              href={dashboardHref}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm shadow-blue-600/20"
            >
              <LayoutDashboard size={16} /> Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-semibold text-brand border border-border rounded-lg hover:border-brand/40 hover:bg-blue-50/50 transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm shadow-blue-600/20"
              >
                Sign Up <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-fg"
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-border bg-surface px-4 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-fg hover:bg-surface-2"
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-3">
            {showAuthed ? (
              <Link
                href={dashboardHref}
                onClick={() => setOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
              >
                <LayoutDashboard size={16} /> Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-brand border border-border rounded-lg"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
                >
                  Sign Up <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
