"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { approvalsApi } from "@/lib/api";
import { initialsOf } from "@/lib/utils";
import GlobalSearch from "@/components/shared/GlobalSearch";
import NotificationsBell from "@/components/shared/NotificationsBell";
import AiChat from "@/components/shared/AiChat";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Vendors", href: "/vendors", icon: Users },
  { name: "RFQs", href: "/rfqs", icon: FileText },
  { name: "Quotations", href: "/quotations", icon: FileSpreadsheet },
  { name: "Approvals", href: "/approvals", icon: CheckCircle2 },
  { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { user, loading, logout, loggingOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // ---- Redirect to login once we know there's no authenticated user ----
  // (Skip when the user is intentionally logging out — that goes to the
  // landing page instead, handled by logout() in AuthContext.)
  useEffect(() => {
    if (!loading && !user && !loggingOut.current) router.push("/login");
  }, [loading, user, router, loggingOut]);

  // ---- Keep the Approvals badge in sync with the backend ----
  useEffect(() => {
    if (!user) return;
    approvalsApi
      .count()
      .then((r) => setPendingCount(r.pending || 0))
      .catch(() => {});
  }, [user, pathname]);

  // ---- Logout handler ----
  // logout() (AuthContext) clears the session and routes to the landing page.
  const handleLogout = () => {
    logout();
  };

  const isActive = (href) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  // ---- While checking auth, show loading ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffdf7]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4 animate-pulse">
            <span className="text-slate-900 font-black text-xl">W</span>
          </div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ---- If user is null after loading, don't render dashboard ----
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#fffdf7]">
      {/* ============ SIDEBAR ============ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="text-slate-900 font-black text-xl">W</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Wolf</h1>
              <p className="text-xs text-slate-400 -mt-0.5">Procurement ERP</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-4 py-6 space-y-1">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Menu
          </p>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  active
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-blue-400"
                        : "text-slate-400 group-hover:text-white"
                    }
                  />
                  {item.name}
                </span>
                {item.href === "/approvals" && pendingCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom tip card */}
        <div className="absolute bottom-6 left-4 right-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-700/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <p className="text-xs font-semibold text-blue-400">PRO TIP</p>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Set auto-approval rules to clear small POs 3x faster.
            </p>
            <button
              onClick={() => { setSidebarOpen(false); router.push("/settings"); }}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              Learn more →
            </button>
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="lg:pl-72">
        {/* Topbar */}
        <header className="sticky top-0 z-40 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-700 hover:text-slate-900"
          >
            <Menu size={22} />
          </button>

          {/* Global search */}
          <GlobalSearch />

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <button
              onClick={() => router.push("/settings")}
              aria-label="Settings"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition hidden sm:block"
            >
              <Settings size={20} />
            </button>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 pr-2 hover:bg-slate-100 rounded-lg transition"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm">
                  {initialsOf(user?.name)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 hidden sm:block transition ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">
                      {user?.name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {user?.role}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push("/settings");
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <User size={16} />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        router.push("/settings");
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Settings size={16} />
                      Preferences
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 py-2">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* Floating RAG assistant (renders itself only when AI chat is configured) */}
      <AiChat />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
        />
      )}

      {/* Dropdown backdrop (click to close). Must sit BELOW the header (z-40)
          so it doesn't intercept clicks on the dropdown menu itself. */}
      {dropdownOpen && (
        <div
          onClick={() => setDropdownOpen(false)}
          className="fixed inset-0 z-30"
        />
      )}
    </div>
  );
}