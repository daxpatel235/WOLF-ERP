// Launch warm-up for the response cache.
//
// The cache makes a screen instant the SECOND time you open it. This makes it
// instant the first time, by fetching what the sidebar can reach while the user
// is still reading the page they landed on. Ten small list requests issued
// during that idle moment cost far less than one request issued at the instant
// someone clicks and then waits for it.
//
// In the desktop app the same table does double duty: before any of it is
// fetched, the shell's on-disk snapshot of these exact paths is read back into
// the cache, so the window opens on the workspace as it was last seen even on
// the very first paint after an install-to-install upgrade.

import { prefetch, seed } from "@/hooks/useFetch";
import { isDesktop, cacheGetMany } from "./desktop";
import api from "./api";

// Each screen is identified by the API path it reads, and the fetcher is
// derived from that path rather than written beside it. The resource helpers in
// lib/api are themselves just `request(path)` for these reads, so this issues
// an identical call — and there is no second copy of the path to fall out of
// step with the first.
//
// It also means these match the keys the desktop snapshot files are stored
// under, which are request paths, so priming from disk needs no translation
// table of its own.
//
// `key`/`deps` must mirror the page's own useFetch options exactly; a drifting
// key is a silent cache miss rather than an error. Ordered by how likely the
// user is to want it next: the dashboard's own panels first, then the sidebar.
const TARGETS = [
  // /dashboard
  { key: "reports:summary", deps: [], path: "/reports/summary" },
  { key: "approvals:pending", deps: [], path: "/approvals?status=Pending" },
  { key: "reports:activity:6", deps: [], path: "/reports/activity?limit=6" },
  { key: "reports:by-category", deps: [], path: "/reports/spend-by-category" },
  // Sidebar lists
  { key: "purchase-orders", deps: [], path: "/purchase-orders" },
  { key: "invoices", deps: [], path: "/invoices" },
  // useVendors() is called with no arguments, so its three filter deps are all
  // undefined — which is what the key has to encode to match.
  { key: "vendors", deps: [undefined, undefined, undefined], path: "/vendors" },
  { key: "rfqs", deps: [], path: "/rfqs" },
  { key: "quotations", deps: [], path: "/quotations" },
  { key: "approvals", deps: [], path: "/approvals" },
];

// Two at a time. Enough to get through the list quickly, few enough that the
// warm-up never competes with the page the user is actually looking at for
// connections or for the server's attention.
const CONCURRENCY = 2;

// Matches the on-device store's own limit. A snapshot older than this is not
// put in front of anyone: it would be replaced within the second by the
// background refresh, but while it was up the user had no way to tell.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// The shell reads from local disk, so this is generous. It exists only so a
// wedged bridge can't hold the window on its splash screen indefinitely —
// past it we simply carry on and let the network fill the page as before.
const PRIME_TIMEOUT_MS = 1500;

let started = false;

/**
 * Desktop only: fill the cache from the shell's on-disk snapshot.
 *
 * This is the desktop counterpart to reading web storage during render, and it
 * exists because web storage alone isn't enough here. The app has two origins —
 * the live site and the copy inside the installer — and storage is partitioned
 * between them, so a snapshot written by one is invisible to the other. The
 * filesystem is the only place both can reach. It is also what carries the
 * cache across an app update, which replaces the webview's storage wholesale.
 *
 * Awaited before the first dashboard paint. That costs one local disk read,
 * against saving a network round trip on every panel of the page behind it.
 *
 * Resolves to the number of screens primed. Never rejects: every failure here
 * means "no snapshot", which is the state the app already handles.
 */
export async function primeFromSnapshot() {
  if (!isDesktop()) return 0;

  const entries = await Promise.race([
    cacheGetMany(TARGETS.map((t) => t.path)),
    new Promise((resolve) => setTimeout(() => resolve([]), PRIME_TIMEOUT_MS)),
  ]).catch(() => []);

  if (!Array.isArray(entries) || !entries.length) return 0;

  const byPath = new Map(TARGETS.map((t) => [t.path, t]));
  const cutoff = Date.now() - MAX_AGE_MS;
  let primed = 0;

  for (const entry of entries) {
    const target = byPath.get(entry?.key);
    if (!target || !entry.body) continue;
    const at = Number(entry.saved_at) || 0;
    if (at < cutoff) continue;
    try {
      // Backdated to when the response actually arrived, so the screen it
      // fills is treated as stale and refreshes behind the user.
      if (seed(target.key, target.deps, JSON.parse(entry.body), at)) primed += 1;
    } catch {
      // A truncated file is no better than a missing one.
    }
  }
  return primed;
}

/**
 * Fetch the main lists in the background, once per session.
 *
 * Safe to call from any mount: it de-dupes itself, skips anything already
 * fresh, and joins requests already in flight rather than duplicating them.
 * Failures are swallowed — a warm-up that doesn't land costs a spinner later,
 * never an error now.
 *
 * @returns {() => void} cancels the remaining queue (e.g. on sign-out)
 */
export function warmCache() {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  let cancelled = false;
  const queue = [...TARGETS];

  const worker = async () => {
    while (!cancelled) {
      const target = queue.shift();
      if (!target) return;
      await prefetch(target.key, target.deps, () => api.get(target.path));
    }
  };

  for (let i = 0; i < CONCURRENCY; i += 1) void worker();

  return () => {
    cancelled = true;
    queue.length = 0;
  };
}

/** Allow a fresh warm-up after a sign-out/sign-in on the same page load. */
export function resetWarmCache() {
  started = false;
}
