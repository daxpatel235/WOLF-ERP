// Shared mapping from a raw ActivityLog record to a <Timeline> item, so the
// dashboard card and the full activity page classify events identically.

import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  UserPlus,
} from "lucide-react";

// Matched in order — the first pattern that hits wins, so put the specific
// verbs above the generic ones.
const RULES = [
  { test: /approv/, icon: CheckCircle2, tone: "green" },
  { test: /reject|cancel/, icon: AlertCircle, tone: "red" },
  { test: /quotation|quote/, icon: Package, tone: "blue" },
  { test: /invoice|paid|payment/, icon: Receipt, tone: "violet" },
  { test: /purchase order|\bpo\b/, icon: ShoppingCart, tone: "amber" },
  { test: /vendor/, icon: Users, tone: "brand" },
  { test: /member|invite|joined/, icon: UserPlus, tone: "brand" },
];

export function activityMeta(action = "") {
  const a = String(action).toLowerCase();
  const hit = RULES.find((r) => r.test.test(a));
  return hit
    ? { icon: hit.icon, tone: hit.tone }
    : { icon: FileText, tone: "blue" };
}

/** Map API activity records to the shape <Timeline> expects. */
export function toTimelineItems(records = []) {
  return records.map((item) => {
    const { icon, tone } = activityMeta(item.action);
    const suffix = item.entityId
      ? ` · ${item.entityId}`
      : item.entityType
      ? ` · ${item.entityType}`
      : "";
    return {
      id: item.id,
      title: item.message || item.action,
      description: `${item.action}${suffix}`,
      time: item.createdAt,
      icon,
      tone,
    };
  });
}
