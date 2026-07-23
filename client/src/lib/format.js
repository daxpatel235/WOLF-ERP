// Shared formatting + style helpers for the dashboard.

export function formatINR(n) {
  if (n === null || n === undefined || isNaN(n)) return "₹0";
  return "₹" + Number(n).toLocaleString("en-IN");
}

// Compact INR for chart axes and tight tiles, using Indian units so the scale
// reads the way the rest of the app's numbers do (₹1.2Cr, not ₹12M).
export function formatCompactINR(n) {
  const v = Number(n);
  if (!v || isNaN(v)) return "₹0";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return `${sign}₹${abs}`;
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
    return "bg-blue-100 text-brand-700";
  return "bg-surface-2 text-fg-muted";
}

export function priorityClass(priority = "") {
  const p = String(priority).toLowerCase();
  if (p === "high") return "bg-red-100 text-red-700";
  if (p === "medium") return "bg-amber-100 text-amber-700";
  return "bg-surface-2 text-fg-muted";
}
