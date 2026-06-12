import Link from "next/link";
import { Search } from "lucide-react";
import { badgeClass, cn } from "@/lib/format";

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200", className)}>
      {children}
    </div>
  );
}

export function Badge({ status, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full",
        badgeClass(status || children)
      )}
    >
      {children || status}
    </span>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative flex-1 max-w-sm">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
      />
    </div>
  );
}

export function FilterTabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "px-3.5 py-1.5 text-sm font-medium rounded-lg transition",
            active === t
              ? "bg-blue-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function PrimaryButton({ children, onClick, type = "button", className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm shadow-blue-600/20",
        className
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, href, className = "" }) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition",
    className
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-16">
      {Icon && <Icon size={40} className="mx-auto text-slate-300 mb-3" />}
      <p className="text-slate-700 font-semibold">{title}</p>
      {hint && <p className="text-sm text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
