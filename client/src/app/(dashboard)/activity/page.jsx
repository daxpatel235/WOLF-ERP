"use client";

import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
  Receipt,
  Clock,
  Loader2,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { reportsApi } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

// Pick an icon for an activity entry based on its action verb.
function activityIcon(action = "") {
  const a = action.toLowerCase();
  if (a.includes("approv")) return { Icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-600" };
  if (a.includes("reject")) return { Icon: AlertCircle, cls: "bg-red-100 text-red-600" };
  if (a.includes("quotation")) return { Icon: Package, cls: "bg-sky-100 text-sky-600" };
  if (a.includes("invoice") || a.includes("sent")) return { Icon: Receipt, cls: "bg-violet-100 text-violet-600" };
  return { Icon: FileText, cls: "bg-blue-100 text-blue-600" };
}

export default function ActivityPage() {
  const { data, loading } = useFetch(() => reportsApi.activity(100), []);
  const items = data?.data || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Activity
        </h1>
        <p className="text-slate-500 mt-1">
          Everything that's happened in your workspace, most recent first.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Loading activity…
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            No activity yet. As you add vendors, RFQs, and orders, they'll show up here.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const { Icon, cls } = activityIcon(item.action);
              return (
                <div key={item.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition">
                  <div className={`p-2.5 rounded-lg ${cls}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.message || item.action}</p>
                    <p className="text-sm text-slate-500 mt-0.5 truncate capitalize">
                      {item.action}
                      {item.entityId ? ` · ${item.entityId}` : item.entityType ? ` · ${item.entityType}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                    <Clock size={12} />
                    {timeAgo(item.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
