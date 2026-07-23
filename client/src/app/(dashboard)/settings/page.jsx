"use client";

import { useState, useEffect } from "react";
import { User, Mail, Shield, Building2, Bell, LayoutGrid, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { initialsOf } from "@/lib/utils";
import { PageHeader, Card } from "@/components/ui/kit";
import DesktopSettings from "@/components/shared/DesktopSettings";

const PREFS_KEY = "wolf_prefs";
const DEFAULT_PREFS = {
  emailNotifications: true,
  approvalAlerts: true,
  compactTables: false,
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  // Preferences are a client-side demo setting, persisted in localStorage.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      setPrefs({ ...DEFAULT_PREFS, ...saved });
    } catch {
      /* ignore bad json */
    }
  }, []);

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  // logout() (AuthContext) clears the session and routes to the landing page.
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your profile and preferences." />

      {/* ---- Profile ---- */}
      <Card className="p-6 sm:p-8 mb-6">
        <h2 className="text-base font-bold text-fg mb-5">Profile</h2>

        <div className="flex items-center gap-4 mb-6">
          <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xl">
            {initialsOf(user?.name)}
          </span>
          <div>
            <p className="text-lg font-bold text-fg">{user?.name}</p>
            <p className="text-sm text-fg-muted capitalize">{user?.role}</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info icon={User} label="Full name" value={user?.name} />
          <Info icon={Mail} label="Email" value={user?.email} />
          <Info icon={Shield} label="Role" value={user?.role} capitalize />
          <Info icon={Building2} label="Company" value={user?.company || "—"} />
        </dl>
      </Card>

      {/* ---- Preferences ---- */}
      <Card className="p-6 sm:p-8 mb-6">
        <h2 className="text-base font-bold text-fg mb-1">Preferences</h2>
        <p className="text-sm text-fg-muted mb-5">These are saved in your browser.</p>

        <div className="divide-y divide-border">
          <Toggle
            icon={Bell}
            label="Email notifications"
            hint="Get an email when something needs your attention."
            on={prefs.emailNotifications}
            onClick={() => toggle("emailNotifications")}
          />
          <Toggle
            icon={Shield}
            label="Approval alerts"
            hint="Notify me when an item is waiting for my sign-off."
            on={prefs.approvalAlerts}
            onClick={() => toggle("approvalAlerts")}
          />
          <Toggle
            icon={LayoutGrid}
            label="Compact tables"
            hint="Show more rows by tightening table spacing."
            on={prefs.compactTables}
            onClick={() => toggle("compactTables")}
          />
        </div>
      </Card>

      {/* ---- Desktop app (renders only inside the Tauri shell) ---- */}
      <DesktopSettings />

      {/* ---- Sign out ---- */}
      <Card className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg">Sign out</p>
          <p className="text-sm text-fg-muted">End your session on this device.</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut size={16} /> Sign out
        </button>
      </Card>
    </div>
  );
}

function Info({ icon: Icon, label, value, capitalize }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="text-fg-muted mt-0.5" />
      <div>
        <dt className="text-xs text-fg-muted">{label}</dt>
        <dd className={`text-fg font-medium ${capitalize ? "capitalize" : ""}`}>{value}</dd>
      </div>
    </div>
  );
}

function Toggle({ icon: Icon, label, hint, on, onClick }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <Icon size={18} className="text-fg-muted mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{label}</p>
          <p className="text-xs text-fg-muted">{hint}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          on ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
