"use client";

// Page-level permission gate. The sidebar already hides destinations a member
// can't use, but that's cosmetic — typing the URL still rendered the page.
// This closes that half. The server re-checks every request regardless, so
// this is about showing an honest message, not about enforcement.

import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/kit";

/**
 * @param permission  a capability name from lib/permissions.js
 * @param allowed     optional pre-computed boolean (wins over `permission`)
 */
export function RoleGate({ permission, allowed, title = "Restricted area", children }) {
  const { can, isOwner, permissionsKnown, user } = useAuth();

  const granted =
    typeof allowed === "boolean" ? allowed : isOwner || can(permission);

  // Until the server has told us what this member may do, `can()` answers
  // false for everything — showing the lock screen then would flash a denial
  // at people who do have access.
  if (!permissionsKnown && typeof allowed !== "boolean") {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-fg-muted">
        <Loader2 size={18} className="animate-spin" /> Checking access…
      </div>
    );
  }

  if (granted) return children;

  return (
    <div className="max-w-lg mx-auto mt-10">
      <Card className="text-center py-12 px-6">
        <span className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
          <Lock className="w-7 h-7" />
        </span>
        <h2 className="text-lg font-bold text-fg">{title}</h2>
        <p className="text-sm text-fg-muted mt-1.5 max-w-sm mx-auto">
          Your role doesn&apos;t have access to this area. Ask a workspace owner
          to grant the permission if you need it.
        </p>
        {user?.role && (
          <p className="mt-4 text-sm text-fg-muted">
            Signed in as <span className="font-medium text-fg">{user.name}</span>{" "}
            <span className="capitalize">({user.role})</span>
          </p>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center mt-5 px-4 py-2.5 rounded-lg text-sm font-semibold text-fg bg-surface border border-border hover:bg-surface-2 transition"
        >
          Back to dashboard
        </Link>
      </Card>
    </div>
  );
}

export default RoleGate;
