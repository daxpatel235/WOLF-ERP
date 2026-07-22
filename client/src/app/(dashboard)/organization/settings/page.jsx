"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Lock, Building2, Eye, ShieldCheck } from "lucide-react";
import { organizationApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/kit";
import { PERMISSION_LABELS, PERMISSION_ORDER } from "@/lib/permissions";

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
        checked ? "bg-blue-600" : "bg-slate-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-[18px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function OrganizationSettingsPage() {
  const { can, isOwner, refreshOrganization } = useAuth();
  const canManage = isOwner || can("canManageOrgSettings");

  const [org, setOrg] = useState(null);
  const [name, setName] = useState("");
  const [directoryVisible, setDirectoryVisible] = useState(true);
  const [defaults, setDefaults] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    organizationApi
      .get()
      .then((r) => {
        setOrg(r.data);
        setName(r.data.name);
        setDirectoryVisible(r.data.settings.directoryVisibleToMembers);
        setDefaults(r.data.settings.memberDefaultPermissions || {});
      })
      .catch((e) => setError(e.message || "Could not load workspace settings."))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const r = await organizationApi.update({
        name: name.trim(),
        settings: { directoryVisibleToMembers: directoryVisible, memberDefaultPermissions: defaults },
      });
      setOrg((o) => ({ ...o, ...r.data }));
      setSaved("Workspace settings saved.");
      await refreshOrganization(); // the header name / permissions may have changed
    } catch (e) {
      setError(e.message || "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-slate-500">
        <Loader2 size={18} className="animate-spin" /> Loading settings…
      </div>
    );
  }
  if (!org) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  const dirty =
    name.trim() !== org.name ||
    directoryVisible !== org.settings.directoryVisibleToMembers ||
    PERMISSION_ORDER.some((k) => (defaults[k] === true) !== (org.settings.memberDefaultPermissions[k] === true));

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 text-sm bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg">
          <CheckCircle2 size={16} /> {saved}
        </div>
      )}
      {!canManage && (
        <div className="flex items-start gap-2.5 p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
          <Lock size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <p>Only the workspace owner (or a member with &ldquo;Workspace settings&rdquo;) can change these.</p>
        </div>
      )}

      {/* Identity */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} className="text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Workspace</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">The name your team sees across the app.</p>
        <input
          value={name}
          disabled={!canManage}
          onChange={(e) => { setName(e.target.value); setSaved(""); }}
          className="w-full max-w-md px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition disabled:bg-slate-50 disabled:text-slate-500"
        />
      </Card>

      {/* Visibility */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Eye size={18} className="text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Member directory</h2>
        </div>
        <div className="flex items-start justify-between gap-6 mt-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Visible to all members</p>
            <p className="text-xs text-slate-400 mt-0.5 max-w-lg">
              When on, every member can see the workspace's member list with names and email addresses.
              When off, only the owner and members who can manage the team can see it.
            </p>
          </div>
          <Toggle
            checked={directoryVisible}
            disabled={!canManage}
            onChange={(v) => { setDirectoryVisible(v); setSaved(""); }}
          />
        </div>
      </Card>

      {/* Default permissions for new members */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Default permissions for new members</h2>
        </div>
        <p className="text-sm text-slate-500 mb-2">
          What someone can do the moment they accept an invitation. You can always tune an individual
          later under Permissions. Access starts restricted until you open it up.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          {PERMISSION_ORDER.map((key) => {
            const meta = PERMISSION_LABELS[key];
            return (
              <div key={key} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                  <p className="text-xs text-slate-400">{meta.hint}</p>
                </div>
                <Toggle
                  checked={defaults[key] === true}
                  disabled={!canManage}
                  onChange={(v) => { setDefaults({ ...defaults, [key]: v }); setSaved(""); }}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {canManage && (
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || !dirty || !name.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save changes
          </button>
          {dirty && <span className="text-xs text-slate-400">You have unsaved changes</span>}
        </div>
      )}
    </div>
  );
}
