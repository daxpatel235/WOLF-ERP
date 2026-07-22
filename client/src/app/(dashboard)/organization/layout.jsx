"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, ShieldCheck, Settings, MessagesSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/format";

const tabs = [
  { name: "Overview", href: "/organization", icon: Building2, exact: true },
  { name: "Members", href: "/organization/members", icon: Users },
  { name: "Permissions", href: "/organization/permissions", icon: ShieldCheck },
  { name: "Settings", href: "/organization/settings", icon: Settings },
  { name: "Chat", href: "/organization/chat", icon: MessagesSquare },
];

export default function OrganizationLayout({ children }) {
  const pathname = usePathname();
  const { organization } = useAuth();

  const isActive = (tab) => (tab.exact ? pathname === tab.href : pathname.startsWith(tab.href));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {organization?.name || "Your workspace"}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Manage the people, permissions and settings for this workspace.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition",
                active
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              )}
            >
              <Icon size={16} />
              {tab.name}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
