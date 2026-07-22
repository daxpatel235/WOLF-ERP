"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserPlus, Loader2, AlertCircle, Crown, Mail, Trash2, Clock, X, CheckCircle2,
} from "lucide-react";
import { teamApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, EmptyState } from "@/components/ui/kit";
import { initialsOf, timeAgo } from "@/lib/utils";
import { ASSIGNABLE_ROLES } from "@/lib/permissions";

export default function MembersPage() {
  const { can, isOwner, user } = useAuth();
  const canInvite = isOwner || can("canInviteMembers");
  const canManage = isOwner || can("canManageMembers");

  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({ email: "", role: "buyer" });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const m = await teamApi.members();
      setMembers(m.data || []);
      // Only members who can invite are allowed to read pending invitations.
      if (canInvite) {
        const i = await teamApi.invites();
        setInvites(i.data || []);
      }
    } catch (e) {
      setError(e.message || "Could not load the team.");
    } finally {
      setLoading(false);
    }
  }, [canInvite]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");
    setNotice("");
    setInviting(true);
    try {
      await teamApi.invite({ email: form.email.trim(), role: form.role });
      setNotice(`Invitation sent to ${form.email.trim()}.`);
      setForm({ email: "", role: "buyer" });
      await load();
    } catch (err) {
      setInviteError(err.message || "Could not send that invitation.");
    } finally {
      setInviting(false);
    }
  };

  const revoke = async (id) => {
    try {
      await teamApi.revokeInvite(id);
      await load();
    } catch (e) { setError(e.message); }
  };

  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.name} from this workspace? They will lose access to all of its data.`)) return;
    try {
      await teamApi.removeMember(m.id);
      setNotice(`${m.name} was removed.`);
      await load();
    } catch (e) { setError(e.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-slate-500">
        <Loader2 size={18} className="animate-spin" /> Loading members…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 p-3 text-sm bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {/* Invite */}
      {canInvite && (
        <Card className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-1">Invite a teammate</h2>
          <p className="text-sm text-slate-500 mb-4">
            They'll get an email with a link to create their account inside this workspace.
          </p>

          {inviteError && (
            <div className="flex items-center gap-2 p-3 mb-4 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
              <AlertCircle size={16} /> {inviteError}
            </div>
          )}

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setInviteError(""); }}
                placeholder="teammate@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition"
              />
            </div>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm capitalize focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting || !form.email.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm shadow-blue-600/20 disabled:opacity-60"
            >
              {inviting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Send invite
            </button>
          </form>
        </Card>
      )}

      {/* Pending invitations */}
      {canInvite && invites.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Pending invitations</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{inv.email}</p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <Clock size={11} /> invited {timeAgo(inv.createdAt)} · joins as
                    <span className="capitalize">{inv.role}</span>
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => revoke(inv.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <X size={14} /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Member directory */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Members <span className="text-slate-400 font-medium">({members.length})</span>
          </h2>
        </div>

        {members.length === 0 ? (
          <EmptyState icon={UserPlus} title="No members yet" hint="Invite a teammate to get started." />
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm">
                    {initialsOf(m.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="truncate">{m.name}</span>
                      {m.isOwner && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 rounded-full">
                          <Crown size={10} /> Owner
                        </span>
                      )}
                      {m.id === user?.id && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                    {/* The registered email, as required by the directory. */}
                    <p className="text-xs text-slate-500 truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline text-xs font-medium text-slate-500 capitalize">{m.role}</span>
                  {canManage && !m.isOwner && (
                    <button
                      onClick={() => remove(m)}
                      aria-label={`Remove ${m.name}`}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
