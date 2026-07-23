"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Users, Crown, ShieldCheck, Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { organizationApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/kit";
import { PERMISSION_LABELS, PERMISSION_ORDER } from "@/lib/permissions";

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
          <p className="text-lg font-bold text-fg truncate">{value}</p>
          {hint && <p className="text-xs text-fg-muted truncate">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function OrganizationOverviewPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    organizationApi
      .get()
      .then((r) => {
        setOrg(r.data);
        setPermissions(r.permissions || {});
      })
      .catch((e) => setError(e.message || "Could not load this workspace."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-fg-muted">
        <Loader2 size={18} className="animate-spin" /> Loading workspace…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-100 text-red-700 rounded-lg">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={Building2} label="Workspace" value={org.name} hint={`Created ${new Date(org.createdAt).toLocaleDateString()}`} />
        <Stat icon={Users} label="Members" value={org.memberCount} hint={org.memberCount === 1 ? "Just you so far" : "Sharing this workspace"} />
        <Stat icon={Crown} label="Owner" value={org.owner?.name || "—"} hint={org.owner?.email} />
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-brand" />
          <h2 className="text-base font-bold text-fg">Your access</h2>
        </div>
        <p className="text-sm text-fg-muted mb-5">
          {org.isOwner
            ? "You own this workspace, so you hold every permission and can delegate them to others."
            : `Signed in as ${user?.name}. These are the capabilities the owner has granted you.`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {PERMISSION_ORDER.map((key) => {
            const granted = permissions[key] === true;
            const meta = PERMISSION_LABELS[key];
            return (
              <div key={key} className="flex items-start gap-2.5 py-1">
                {granted ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle size={16} className="mt-0.5 shrink-0 text-slate-300" />
                )}
                <div className="min-w-0">
                  <p className={granted ? "text-sm font-medium text-fg" : "text-sm text-fg-muted"}>
                    {meta.label}
                  </p>
                  <p className="text-xs text-fg-muted">{meta.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-bold text-fg mb-1">Working as a team</h2>
        <p className="text-sm text-fg-muted">
          Everything in this workspace — vendors, RFQs, quotations, purchase orders and invoices — is
          shared by every member. Invite teammates from{" "}
          <Link href="/organization/members" className="font-semibold text-brand hover:text-brand-700">
            Members
          </Link>
          , tune what they can do under{" "}
          <Link href="/organization/permissions" className="font-semibold text-brand hover:text-brand-700">
            Permissions
          </Link>
          , and talk it through in{" "}
          <Link href="/organization/chat" className="font-semibold text-brand hover:text-brand-700">
            Chat
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
