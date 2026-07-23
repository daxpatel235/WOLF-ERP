import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Shared layout + typography for legal pages (Terms, Privacy) so both read
// consistently. Renders inside the marketing layout (navbar + footer).
export default function LegalShell({ title, updated, intro, children }) {
  return (
    <div className="bg-surface">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-700"
        >
          <ArrowLeft size={15} /> Back to home
        </Link>

        <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
          {title}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">Last updated: {updated}</p>

        {intro && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {intro}
          </div>
        )}

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

// Section heading + body block.
export function Section({ n, title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-fg mb-3">
        {n ? <span className="text-fg-muted">{n}. </span> : null}
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

// Bulleted list for legal copy.
export function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-fg-muted">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
