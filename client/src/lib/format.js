// Shared formatting + style helpers for the dashboard.

export function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN");
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

// Map any status string to a tailwind badge style (semantic colors).
export function badgeClass(status = "") {
  const s = String(status).toLowerCase();
  if (/(paid|approved|active|received|awarded|completed|processed|won)/.test(s))
    return "bg-emerald-100 text-emerald-700";
  if (/(overdue|rejected|blacklisted|cancelled|declined|lost|inactive)/.test(s))
    return "bg-red-100 text-red-700";
  if (/(pending|draft|processing|partial|review|shortlisted|on hold)/.test(s))
    return "bg-amber-100 text-amber-700";
  if (/(published|sent|new|open|invited)/.test(s))
    return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

export function priorityClass(priority = "") {
  const p = String(priority).toLowerCase();
  if (p === "high") return "bg-red-100 text-red-700";
  if (p === "medium") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}
