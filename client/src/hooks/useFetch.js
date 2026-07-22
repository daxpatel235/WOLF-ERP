"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ---- Module-level response cache (stale-while-revalidate) ----
// Navigating back to a page you opened moments ago should feel instant, not
// replay a full-panel spinner. We keep the last successful response per key, so
// a revisit paints real data on the FIRST frame and then quietly refreshes in
// the background, swapping in new data only if it actually changed.
//
// This lives at module scope rather than in React state on purpose: the data has
// to outlive the component that fetched it, which is the entire point.
const cache = new Map(); // key -> { data, at }

// De-dupes concurrent identical requests. Several components mounting at once
// and asking for the same thing (e.g. a list page and the layout badge) should
// produce ONE network call, not one each.
const inflight = new Map(); // key -> Promise

// Within this window a revisit is served purely from cache and costs zero
// network. Past it the stale copy still renders instantly, but a background
// refresh starts immediately. Short enough that data never looks wrong.
const FRESH_MS = 30 * 1000;

/**
 * Drop cached responses. Called on logout — cached data belongs to the account
 * that fetched it and must never survive into the next session on a shared
 * device.
 */
export function clearFetchCache() {
  cache.clear();
  inflight.clear();
}

/**
 * Invalidate cache entries so the next read refetches. Pass a key prefix (e.g.
 * "vendors") to target one resource, or nothing to invalidate everything.
 * Use after a mutation that makes other views stale.
 */
export function invalidate(prefix) {
  for (const k of [...cache.keys()]) {
    if (!prefix || k === prefix || k.startsWith(`${prefix}|`)) cache.delete(k);
  }
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
  const hit = cacheKey ? cache.get(cacheKey) : null;

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
      if (k) cache.set(k, { data: result, at: Date.now() });
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
    const entry = keyRef.current ? cache.get(keyRef.current) : null;
    // Cached and still fresh → nothing to do; the render above already showed it.
    if (entry && Date.now() - entry.at < fresh) return;
    // Stale copy on screen → refresh quietly. Nothing on screen → real load.
    run({ background: Boolean(entry) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Force a network read and refresh the cache (used after mutations). Silent
  // when there is already data on screen to keep showing; a visible load only
  // when the page would otherwise be empty anyway.
  const hasData = useRef(false);
  hasData.current = data != null;
  const refetch = useCallback(() => run({ background: hasData.current }), [run]);

  return { data, loading, validating, error, refetch, setData };
}

export default useFetch;
