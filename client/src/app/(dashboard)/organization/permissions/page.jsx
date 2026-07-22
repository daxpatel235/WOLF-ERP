"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle, Crown, ShieldCheck, Lock } from "lucide-react";
import { teamApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, EmptyState } from "@/components/ui/kit";
import { initialsOf } from "@/lib/utils";
import { PERMISSION_LABELS, PERMISSION_ORDER, ASSIGNABLE_ROLES } from "@/lib/permissions";

function Toggle({ checked, disabled, onChange, id }) {
  return (
    <button
      id={id}
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

export default function PermissionsPage() {
  const { can, isOwner } = useAuth();
  const canManage = isOwner || can("canManageMembers");

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await teamApi.members();
      setMembers(r.data || []);
    } catch (e) {
      setError(e.message || "Could not load members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Optimistic: flip locally, persist, roll back on failure.
  const patch = async (member, body, optimistic) => {
    const before = members;
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, ...optimistic } : m)));
    setSavingId(member.id);
    setError("");
    try {
      const r = await teamApi.updateMember(member.id, body);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? r.data : m)));
    } catch (e) {
      setMembers(before);
      setError(e.message || "Could not save that change.");
    } finally {
      setSavingId(null);
    }
  };

  const togglePermission = (member, key, value) =>
    patch(member, { permissions: { [key]: value } }, { permissions: { ...member.permissions, [key]: value } });

  const changeRole = (member, role) => patch(member, { role }, { role });

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-slate-500">
        <Loader2 size={18} className="animate-spin" /> Loading permissions…
      </div>
    );
  }

  const others = members.filter((m) => !m.isOwner);
  const owner = members.find((m) => m.isOwner);

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!canManage && (
        <div className="flex items-start gap-2.5 p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
          <Lock size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <p>You can see what each teammate is allowed to do, but only the owner (or a member with
            &ldquo;Manage members&rdquo;) can change it.</p>
        </div>
      )}

      {owner && (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm">
              {initialsOf(owner.name)}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                {owner.name}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 rounded-full">
                  <Crown size={10} /> Owner
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Holds every permission, always. The owner can't be restricted or removed.
              </p>
            </div>
          </div>
        </Card>
      )}

      {others.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No teammates to configure yet"
            hint="Invite someone from the Members tab, then grant them the rights they need."
          />
        </Card>
      ) : (
        others.map((m) => (
          <Card key={m.id} className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm">
                  {initialsOf(m.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{m.name}</p>
                  <p className="text-xs text-slate-500 truncate">{m.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {savingId === m.id && <Loader2 size={14} className="animate-spin text-slate-400" />}
                <select
                  value={m.role}
                  disabled={!canManage}
                  onChange={(e) => changeRole(m, e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 disabled:opacity-60"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r} className="capitalize">{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 px-6 py-4">
              {PERMISSION_ORDER.map((key) => {
                const meta = PERMISSION_LABELS[key];
                const checked = m.permissions?.[key] === true;
                return (
                  <div key={key} className="flex items-start justify-between gap-3 py-2.5">
                    <label htmlFor={`${m.id}-${key}`} className="min-w-0 cursor-pointer">
                      <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                      <p className="text-xs text-slate-400">{meta.hint}</p>
                    </label>
                    <Toggle
                      id={`${m.id}-${key}`}
                      checked={checked}
                      disabled={!canManage || savingId === m.id}
                      onChange={(v) => togglePermission(m, key, v)}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
