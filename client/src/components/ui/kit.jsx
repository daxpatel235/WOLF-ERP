import Link from "next/link";
import { Search } from "lucide-react";
import { badgeClass, cn } from "@/lib/format";

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-fg tracking-tight">{title}</h1>
        {subtitle && <p className="text-fg-muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={cn("bg-surface rounded-2xl border border-border", className)}>
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
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm placeholder:text-fg-muted focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
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
              : "bg-surface border border-border text-fg-muted hover:border-brand/40"
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
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-fg bg-surface border border-border rounded-lg hover:bg-surface-2 transition",
    className
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-16">
      {Icon && <Icon size={40} className="mx-auto text-slate-300 mb-3" />}
      <p className="text-fg font-semibold">{title}</p>
      {hint && <p className="text-sm text-fg-muted mt-1">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form primitives — token-based, so a field looks identical everywhere it is
// used and restyles from one place. `Field` owns the label/hint/error rhythm;
// the inputs own nothing but their own state.
// ---------------------------------------------------------------------------

export function Field({ label, hint, error, action, children }) {
  return (
    <div className="block">
      {(label || action) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="block text-sm font-medium text-fg">{label}</span>
          )}
          {action}
        </div>
      )}
      {children}
      {hint && !error && (
        <span className="block text-xs text-fg-muted mt-1">{hint}</span>
      )}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
}

const INPUT_CLASS =
  "w-full px-3 py-2.5 rounded-lg border bg-surface text-fg text-sm placeholder:text-fg-muted transition focus:outline-none focus:ring-2 disabled:opacity-60";
const INPUT_OK = "border-border focus:border-brand focus:ring-brand/20";
const INPUT_ERR = "border-red-300 focus:border-red-400 focus:ring-red-100";

// `invalid` swaps the ring/border to the error palette; `icon` insets a lucide
// icon on the left and pads the text to clear it.
export function Input({ className = "", invalid = false, icon: Icon, trailing, ...props }) {
  const input = (
    <input
      {...props}
      className={cn(
        INPUT_CLASS,
        invalid ? INPUT_ERR : INPUT_OK,
        Icon && "pl-10",
        trailing && "pr-11",
        className
      )}
    />
  );
  if (!Icon && !trailing) return input;
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
        />
      )}
      {input}
      {trailing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  );
}

export function Textarea({ className = "", invalid = false, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={cn(INPUT_CLASS, invalid ? INPUT_ERR : INPUT_OK, "resize-y", className)}
    />
  );
}

const BTN_VARIANTS = {
  primary:
    "bg-gradient-to-r from-brand to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 shadow-sm shadow-brand/25 hover:shadow-lg hover:shadow-brand/40 hover:-translate-y-0.5",
  accent:
    "bg-gradient-to-r from-accent to-accent-600 text-white hover:from-accent-600 hover:to-accent-700 shadow-sm shadow-accent/25 hover:shadow-lg hover:shadow-accent/40 hover:-translate-y-0.5",
  ghost:
    "bg-surface text-fg border border-border hover:bg-surface-2 hover:border-brand/40 hover:shadow-md hover:-translate-y-0.5",
  subtle: "bg-surface-2 text-fg hover:bg-border/60 hover:shadow-sm hover:-translate-y-px",
  danger:
    "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-sm shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5",
};
const BTN_SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold select-none",
        "transition-all duration-150 ease-spring active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
        BTN_VARIANTS[variant] || BTN_VARIANTS.primary,
        BTN_SIZES[size] || BTN_SIZES.md,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// Segmented control for switching a page between list / board / card views.
// `views` is [{ key, label, icon }].
export function ViewToggle({ views, active, onChange, className = "" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-surface p-0.5",
        className
      )}
    >
      {views.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={active === key}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition",
            active === key
              ? "bg-brand text-white shadow-sm shadow-brand/25"
              : "text-fg-muted hover:text-fg"
          )}
        >
          {Icon && <Icon size={15} />}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// Small caps section label — grouping in sidebars, cards and forms.
export function SectionLabel({ children, className = "" }) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-fg-muted",
        className
      )}
    >
      {children}
    </p>
  );
}
