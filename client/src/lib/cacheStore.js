// On-device store behind the response cache in hooks/useFetch.
//
// The in-memory cache makes navigation instant WITHIN a session, but it dies
// with the page. Every cold start — a browser reload, or launching the desktop
// app — therefore began from empty: a full-panel spinner while the network
// answered, on data the device had already seen minutes earlier. This mirrors
// those entries to web storage, so a relaunch paints the last known figures on
// the FIRST frame and refreshes behind them.
//
// Web storage rather than IndexedDB on purpose: reads here have to be
// synchronous. An async store cannot answer before the first render, which is
// precisely the frame we are trying to fill — it would only move the spinner,
// not remove it.

import { TOKEN_KEY, USER_KEY } from "./constants";

const NS = "wolf_cache";
// Bumped when the stored shape changes; entries from older versions are
// ignored and swept up by prune() rather than being fed to a newer reader.
const VERSION = 1;

// Past this, a stored copy is too old to put in front of someone. It would
// still be replaced within a second by the background refresh, but a figure
// from last week flashing up as though it were current is worse than a
// spinner — the user has no way to tell it was stale while it was on screen.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// One oversized response (a long PO list with line items) can consume the
// whole storage budget and evict everything else. Those pages are also the
// ones where a stale paint helps least, so they simply aren't persisted.
const MAX_ENTRY_BYTES = 256 * 1024;

// Web storage is ~5MB per origin and it is NOT ours alone — the session lives
// there too. Cap the entry count so the cache can never crowd out the token.
const MAX_ENTRIES = 80;

/**
 * Where to persist, following the session.
 *
 * If the token is in localStorage the user asked to be remembered, and their
 * data may outlive the window. If it is in sessionStorage they asked for a
 * session that dies with the tab — persisting their invoices to disk anyway
 * would quietly overrule that, so the cache lands in the same store as the
 * credential that authorised it.
 *
 * Returns null when storage is unavailable (private mode, disabled cookies,
 * SSR), which every caller treats as a plain cache miss.
 */
function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY)
      ? window.localStorage
      : window.sessionStorage;
  } catch {
    return null;
  }
}

// Namespaced per account: two people using the same machine must never be able
// to read each other's workspace out of storage, even for the moment before
// the first refresh lands. Memoised because it is consulted on every read.
let scopeId;

function scope() {
  if (scopeId !== undefined) return scopeId;
  scopeId = "anon";
  try {
    const raw =
      window.localStorage.getItem(USER_KEY) ||
      window.sessionStorage.getItem(USER_KEY);
    const user = raw ? JSON.parse(raw) : null;
    if (user?.id || user?._id) scopeId = String(user.id || user._id);
  } catch {
    // Unreadable storage or a corrupt user blob — stay on "anon", which simply
    // means this session shares no entries with the previous one.
  }
  return scopeId;
}

const prefix = () => `${NS}:${VERSION}:${scope()}:`;

// Incremented every time the cache is wiped, i.e. on every sign-in and
// sign-out. A read or fetch that was already in flight when the session
// changed compares the era it started in against this before writing anything,
// so one account's response can never be filed under the next account's name.
let epoch = 0;

/** The current session era. See `epoch`. */
export const cacheEpoch = () => epoch;

/** Every key this module owns, across all scopes and versions. */
function ownedKeys(store) {
  const keys = [];
  try {
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k && k.startsWith(`${NS}:`)) keys.push(k);
    }
  } catch {
    // Enumeration can throw if storage is revoked mid-session.
  }
  return keys;
}

function drop(store, keys) {
  for (const k of keys) {
    try {
      store.removeItem(k);
    } catch {
      // Nothing useful to do; the entry stays until the next sweep.
    }
  }
}

/** When an entry was written, or 0 if it can't be read. Used only to rank. */
function ageOf(store, key) {
  try {
    const parsed = JSON.parse(store.getItem(key));
    return typeof parsed?.at === "number" ? parsed.at : 0;
  } catch {
    return 0;
  }
}

/**
 * Make room by discarding the oldest half of what we hold.
 *
 * Half rather than one entry so a run of writes doesn't pay for an eviction
 * sweep each time. Returns whether anything was actually freed — the caller
 * only retries if it was.
 */
function evict(store) {
  const keys = ownedKeys(store);
  if (!keys.length) return false;
  const ranked = keys
    .map((k) => ({ k, at: ageOf(store, k) }))
    .sort((a, b) => a.at - b.at);
  drop(store, ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 2))).map((e) => e.k));
  return true;
}

/**
 * Read a persisted response.
 *
 * @returns {{ data: any, at: number } | null} — null for a miss, and for an
 *   entry that is unreadable or past MAX_AGE_MS, both of which are cleaned up
 *   on the way out.
 */
export function readEntry(key) {
  const store = storage();
  if (!store) return null;
  const full = prefix() + key;

  let raw;
  try {
    raw = store.getItem(full);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== "number") throw new Error("bad shape");
    if (Date.now() - parsed.at > MAX_AGE_MS) {
      drop(store, [full]);
      return null;
    }
    return { data: parsed.data, at: parsed.at };
  } catch {
    // A truncated or half-written entry is no better than a miss.
    drop(store, [full]);
    return null;
  }
}

/**
 * Persist a response. Silent on failure — a cache that can't be written is a
 * slower app, never a broken one.
 */
export function writeEntry(key, data, at = Date.now()) {
  const store = storage();
  if (!store) return;

  let payload;
  try {
    payload = JSON.stringify({ at, data });
  } catch {
    return; // not serialisable — nothing to store
  }
  if (payload.length > MAX_ENTRY_BYTES) return;

  const full = prefix() + key;
  try {
    store.setItem(full, payload);
  } catch {
    // Almost always the quota. Free space and take one more run at it; if that
    // fails too, this entry simply isn't cached.
    if (!evict(store)) return;
    try {
      store.setItem(full, payload);
    } catch {
      /* give up quietly */
    }
  }
}

/**
 * Forget entries for a resource, mirroring invalidate() in useFetch.
 *
 * Keys are `resource|deps`, and a resource may be namespaced with `:` — so
 * "vendors" drops every cached filter combination of the vendor list, and
 * "reports" drops "reports:summary" and its siblings. The two separators are
 * also what stop "vendor" from taking "vendors" with it.
 *
 * Without this a mutation would clear memory but leave the superseded copy on
 * disk, and the next launch would paint exactly what was invalidated.
 */
export function dropEntries(resourcePrefix) {
  const store = storage();
  if (!store) return;
  const base = prefix();
  const target = resourcePrefix ? base + resourcePrefix : base;
  drop(
    store,
    ownedKeys(store).filter((k) => {
      if (!k.startsWith(base)) return false;
      if (!resourcePrefix) return true;
      return k === target || k.startsWith(`${target}|`) || k.startsWith(`${target}:`);
    })
  );
}

/**
 * Wipe everything this module owns, in BOTH stores and across all scopes.
 *
 * Called on sign-out and sign-in. Cached responses belong to the account that
 * fetched them, so nothing may survive into the next session on a shared
 * machine — including entries left by a version or account we no longer know
 * the id of.
 */
export function clearAll() {
  if (typeof window === "undefined") return;
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      drop(store, ownedKeys(store));
    } catch {
      /* storage unavailable — nothing to clear */
    }
  }
  scopeId = undefined; // the next read re-reads the (possibly new) account
  epoch += 1; // anything still in flight for the old session is now void
}

/**
 * Housekeeping sweep: drop expired entries, anything from another account or
 * an older format, and the oldest of what's left if we're over budget.
 *
 * Run once per launch, off the critical path — entries a user never revisits
 * would otherwise accumulate until a write hit the quota.
 */
export function prune() {
  const store = storage();
  if (!store) return;
  const base = prefix();
  const now = Date.now();
  const mine = [];

  for (const k of ownedKeys(store)) {
    if (!k.startsWith(base)) {
      drop(store, [k]); // another account, or a superseded format
      continue;
    }
    const at = ageOf(store, k);
    if (!at || now - at > MAX_AGE_MS) drop(store, [k]);
    else mine.push({ k, at });
  }

  if (mine.length > MAX_ENTRIES) {
    mine.sort((a, b) => a.at - b.at);
    drop(store, mine.slice(0, mine.length - MAX_ENTRIES).map((e) => e.k));
  }
}
