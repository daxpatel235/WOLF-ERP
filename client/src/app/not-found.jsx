import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-canvas px-4">
      <div className="text-center max-w-sm">
        <span className="mx-auto mb-5 grid place-items-center w-14 h-14 rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
          <Compass className="w-7 h-7" />
        </span>
        <p className="text-5xl font-bold tracking-tight text-fg tabular-nums">404</p>
        <h1 className="text-lg font-bold text-fg mt-3">Page not found</h1>
        <p className="text-sm text-fg-muted mt-1.5">
          That link doesn&apos;t lead anywhere in Wolf. It may have been moved or
          the record deleted.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand to-brand-600 shadow-sm shadow-brand/25 hover:from-brand-600 hover:to-brand-700 transition"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-fg bg-surface border border-border hover:bg-surface-2 transition"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
