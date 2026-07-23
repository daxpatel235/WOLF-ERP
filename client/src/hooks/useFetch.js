"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  readEntry,
  writeEntry,
  dropEntries,
  clearAll,
  prune,
  cacheEpoch,
} from "@/lib/cacheStore";

// ---- Module-level response cache (stale-while-revalidate) ----
// Navigating back to a page you opened moments ago should feel instant, not
// replay a full-panel spinner. We keep the last successful response per key, so
// a revisit paints real data on the FIRST frame and then quietly refreshes in
// the background, swapping in new data only if it actually changed.
//
// This lives at module scope rather than in React state on purpose: the data has
// to outlive the component that fetched it, which is the entire point.
//
// It is backed by an on-device store (lib/cacheStore), so the same guarantee
// survives a reload or an app relaunch: the first frame after launch shows the
// workspace as it was last seen, not a spinner.
const cache = new Map(); // key -> { data, at }

// De-dupes concurrent identical requests. Several components mounting at once
// and asking for the same thing (e.g. a list page and the layout badge) should
// produce ONE network call, not one each.
const inflight = new Map(); // key -> Promise

// Keys we have already looked for on device. A miss is worth remembering:
// without this, a key that isn't persisted would hit storage on every single
// render of the component waiting on it.
const hydrated = new Set();

// Within this window a revisit is served purely from cache and costs zero
// network. Past it the stale copy still renders instantly, but a background
// refresh starts immediately. Short enough that data never looks wrong.
const FRESH_MS = 30 * 1000;

/**
 * Look up a key, falling back to the device once per key per session.
 *
 * Called during render, which is safe here: the maps are module-level and the
 * operation is idempotent, so a double render (StrictMode) just repeats it.
 */
function lookup(key) {
  const mem = cache.get(key);
  if (mem) return mem;
  if (hydrated.has(key)) return null;
  hydrated.add(key);

  const stored = readEntry(key);
  if (!stored) return null;
  // Adopt it into memory so every other component in this same paint shares
  // the one copy instead of each parsing storage for itself.
  cache.set(key, stored);
  return stored;
}

/**
 * Record a response in memory and on device, keeping the two in step.
 *
 * @param {number} era - the session this response was requested in. A request
 *   that was already in flight when someone signed out (or in) must be dropped
 *   rather than filed, or the incoming account inherits the previous one's data.
 */
function remember(key, data, era = cacheEpoch()) {
  if (era !== cacheEpoch()) return;
  const at = Date.now();
  cache.set(key, { data, at });
  hydrated.add(key);
  // Deferred: serialising a large list is cheap but not free, and it must not
  // land in the same frame as the render that follows a completed fetch.
  defer(() => {
    if (era === cacheEpoch()) writeEntry(key, data, at);
  });
}

/** Run after the browser is done with the current frame. */
function defer(fn) {
  if (typeof window === "undefined") return;
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => fn(), { timeout: 2000 });
  } else {
    setTimeout(fn, 0);
  }
}

/**
 * Drop cached responses. Called on logout — cached data belongs to the account
 * that fetched it and must never survive into the next session on a shared
 * device, which is why the on-device copy goes with it.
 */
export function clearFetchCache() {
  cache.clear();
  inflight.clear();
  hydrated.clear();
  clearAll();
}

/**
 * Does a cache key belong to a resource?
 *
 * A key is `resource|deps`, and a resource may itself be namespaced with `:`
 * — "reports:summary", "approvals:pending". Both separators therefore have to
 * count, or invalidating "reports" would sail straight past every report there
 * is. It matched only `reports|…`, a key nothing uses, so the spend charts kept
 * serving figures from before the vendor edit that was meant to refresh them.
 *
 * The separators are what keep this from over-reaching: "vendor" does not
 * match "vendors|[]", because neither `vendor|` nor `vendor:` begins it.
 */
function matchesResource(key, resource) {
  return (
    key === resource ||
    key.startsWith(`${resource}|`) ||
    key.startsWith(`${resource}:`)
  );
}

/**
 * Invalidate cache entries so the next read refetches. Pass a key prefix (e.g.
 * "vendors") to target one resource, or nothing to invalidate everything.
 * Use after a mutation that makes other views stale.
 *
 * The on-device copy is dropped too. Clearing only memory would leave the
 * superseded response on disk for the next launch to paint — the exact stale
 * read the invalidation was meant to prevent.
 */
export function invalidate(prefix) {
  for (const k of [...cache.keys()]) {
    if (!prefix || matchesResource(k, prefix)) cache.delete(k);
  }
  // `hydrated` entries are deliberately left in place: the key is now known to
  // be absent, and re-reading the device for it would be pointless work.
  dropEntries(prefix);
}

// ---- "The user is back" signal ----
// One set of listeners for the whole app rather than a pair per hook: a page
// with six panels would otherwise register six visibility handlers that all
// fire on the same event.
//
// Gated on an interval so that alt-tabbing repeatedly can't turn into a burst
// of requests — the point is to catch a genuine return to the app, not every
// flick of focus.
const focusSubscribers = new Set();
const REFOCUS_MS = 60 * 1000;
let lastFocusAt = Date.now();

function onFocus(fn) {
  focusSubscribers.add(fn);
  return () => focusSubscribers.delete(fn);
}

if (typeof document !== "undefined") {
  const wake = () => {
    if (document.visibilityState === "hidden") return;
    if (Date.now() - lastFocusAt < REFOCUS_MS) return;
    lastFocusAt = Date.now();
    for (const fn of focusSubscribers) {
      try {
        fn();
      } catch {
        // One panel failing to refresh must not stop the others.
      }
    }
  };
  document.addEventListener("visibilitychange", wake);
  // Also on `online`: regaining a connection is the other moment the data on
  // screen is likely to be behind, and it fires without a visibility change.
  window.addEventListener("online", () => {
    lastFocusAt = 0; // a reconnection always deserves a refresh
    wake();
  });
}

/**
 * Warm a cache entry without rendering anything.
 *
 * Used at launch to fetch the handful of lists behind the main navigation, so
 * the first click into any of them is instant instead of costing a round trip.
 * Skips anything already fresh, and joins an in-flight request rather than
 * duplicating it, so a warm-up can never race the page that needs the data.
 *
 * @param {string} key    - resource key, matching the page's `key` option
 * @param {Array}  deps   - the page's deps, so the key resolves identically
 * @param {() => Promise<any>} fetcher
 */
export function prefetch(key, deps, fetcher) {
  const k = `${key}|${JSON.stringify(deps)}`;
  const entry = lookup(k);
  if (entry && Date.now() - entry.at < FRESH_MS) return Promise.resolve(entry.data);

  const existing = inflight.get(k);
  if (existing) return existing.catch(() => null);

  const era = cacheEpoch();
  const promise = fetcher();
  inflight.set(k, promise);
  return promise
    .then((result) => {
      remember(k, result, era);
      return result;
    })
    .catch(() => null) // a warm-up that fails costs nothing; the page will retry
    .finally(() => {
      if (inflight.get(k) === promise) inflight.delete(k);
    });
}

/**
 * Put a response into the cache that came from somewhere other than a fetch —
 * the desktop app's on-disk snapshot, at launch.
 *
 * Never overwrites something already cached: whatever is in memory was either
 * fetched this session or restored from this origin's own storage, and both
 * are at least as current as a file on disk.
 *
 * @param {number} at - when the response was originally received, NOT now.
 *   Backdating it is what makes the entry count as stale, so the screen it
 *   fills gets a background refresh rather than being trusted outright.
 * @returns {boolean} whether it was taken
 */
export function seed(key, deps, data, at) {
  const k = `${key}|${JSON.stringify(deps)}`;
  if (lookup(k)) return false;
  cache.set(k, { data, at });
  hydrated.add(k);
  // Mirrored into this origin's storage too, so the next launch on this origin
  // doesn't need the shell at all — it can paint synchronously, before the
  // first frame, exactly as the web build does.
  defer(() => writeEntry(k, data, at));
  return true;
}

/** Housekeeping sweep of the on-device store. Safe to call more than once. */
let pruned = false;
export function pruneFetchCache() {
  if (pruned) return;
  pruned = true;
  defer(prune);
}

/**
 * Generic data-fetching hook with an optional shared cache.
 *
 * @param {() => Promise<any>} fetcher - returns a promise (e.g. an api call)
 * @param {Array} deps - re-run when these change
 * @param {{ key?: string, keyDeps?: Array, fresh?: number }} [options]
 *   key     - enables caching. Identifies the RESOURCE; the deps are folded in
 *             automatically, so `key: "vendor"` with deps `[id]` caches per id.
 *             Omit it to opt out of caching entirely (previous behaviour).
 *   keyDeps - use these instead of `deps` to build the cache key. For the case
 *             where something should RE-CHECK more often than it varies — e.g.
 *             a badge that revalidates on every route change but is still one
 *             cache entry, not one per route.
 *   fresh   - ms a cached entry is served without revalidating (default 30s).
 * @returns {{ data, loading, validating, error, refetch, setData }}
 *   loading    - true only when there is nothing to show yet (first ever load).
 *                Gate your spinner on this.
 *   validating - true during a background refresh while stale data IS on screen.
 *                Use for a subtle indicator, never to blank the page.
 */
export function useFetch(fetcher, deps = [], { key, keyDeps, fresh = FRESH_MS } = {}) {
  const cacheKey = key ? `${key}|${JSON.stringify(keyDeps ?? deps)}` : null;
  const hit = cacheKey ? lookup(cacheKey) : null;

  const [data, setData] = useState(hit ? hit.data : null);
  const [loading, setLoading] = useState(!hit);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);

  // When the key changes (e.g. navigating between two detail pages, which
  // reuses the component instead of remounting it) we must re-derive state
  // immediately. Adjusting state during render is the supported React pattern
  // for this — it re-renders before committing, so no stale flash reaches the
  // screen and no extra effect pass is needed.
  const [renderedKey, setRenderedKey] = useState(cacheKey);
  if (cacheKey !== renderedKey) {
    setRenderedKey(cacheKey);
    setData(hit ? hit.data : null);
    setLoading(!hit);
    setError(null);
  }

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(cacheKey);
  keyRef.current = cacheKey;
  // Guards against setting state after unmount, and against a slow response for
  // an OLD key landing after the key already moved on.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async ({ background = false } = {}) => {
    const k = keyRef.current;
    const era = cacheEpoch(); // the session this read belongs to
    if (background) setValidating(true);
    else setLoading(true);
    setError(null);

    try {
      // Join an in-flight request for the same key instead of firing a second.
      let promise = k ? inflight.get(k) : null;
      if (!promise) {
        promise = fetcherRef.current();
        if (k) {
          inflight.set(k, promise);
          // .finally() returns a NEW promise that rejects in step with this one;
          // left unhandled it would surface as an unhandled rejection on every
          // failed request. The rejection is already handled by the await below,
          // so swallow it here — this branch only does bookkeeping.
          promise
            .finally(() => {
              if (inflight.get(k) === promise) inflight.delete(k);
            })
            .catch(() => {});
        }
      }

      const result = await promise;
      if (k) remember(k, result, era);
      // Ignore a response whose key is no longer the one being displayed.
      if (mounted.current && keyRef.current === k) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (err) {
      // A failed background refresh must NOT wipe good data off the screen —
      // keep showing the cached copy and surface the error only when we have
      // nothing else to display.
      if (mounted.current && keyRef.current === k && !background) setError(err);
      return null;
    } finally {
      if (mounted.current) {
        setLoading(false);
        setValidating(false);
      }
    }
  }, []);

  useEffect(() => {
    const entry = keyRef.current ? lookup(keyRef.current) : null;
    // Cached and still fresh → nothing to do; the render above already showed it.
    if (entry && Date.now() - entry.at < fresh) return;
    // Stale copy on screen → refresh quietly. Nothing on screen → real load.
    // A copy restored from the device is always past `fresh`, so a launch
    // paints instantly AND still ends up on current data a moment later.
    run({ background: Boolean(entry) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Force a network read and refresh the cache (used after mutations). Silent
  // when there is already data on screen to keep showing; a visible load only
  // when the page would otherwise be empty anyway.
  const hasData = useRef(false);
  hasData.current = data != null;
  const refetch = useCallback(() => run({ background: hasData.current }), [run]);

  // ---- Refresh when the user comes back ----
  // A desktop window left open overnight, or a tab restored days later, would
  // otherwise sit on whatever it last fetched until something forced a reload.
  // Coming back to the app is the moment the user looks at the numbers again,
  // so that is the moment to check them — quietly, never by replacing what
  // they came back to with a spinner.
  useEffect(() => {
    if (!cacheKey) return undefined;
    return onFocus(() => {
      const entry = lookup(keyRef.current);
      if (entry && Date.now() - entry.at < fresh) return;
      run({ background: Boolean(entry) || hasData.current });
    });
  }, [cacheKey, fresh, run]);

  return { data, loading, validating, error, refetch, setData };
}

export default useFetch;
