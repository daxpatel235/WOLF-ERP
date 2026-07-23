// Bridge to the Wolf ERP desktop shell.
//
// This same build runs in three places: a browser tab, the desktop window
// loading it live over the network, and the copy bundled inside the installer
// when there's no connection. Everything here is a no-op in a browser, so pages
// can call it unconditionally.
//
// Why the cache and the session token live in Rust rather than localStorage:
// the live site and the bundled fallback are different origins, and web storage
// is partitioned per origin. A token written while online would be invisible to
// the offline build, so signing in would be lost the moment the network was.
// The filesystem is the only place both origins can reach.

export const isDesktop = () =>
  typeof window !== "undefined" && window.__WOLF_DESKTOP__ === true;

export const desktopVersion = () =>
  typeof window !== "undefined" ? window.__WOLF_VERSION__ || null : null;

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

// Resolved once and reused. The import is dynamic so the module never loads in
// a browser, where it would throw — and memoised as a promise so concurrent
// callers share one in-flight import instead of racing.
let corePromise = null;
function core() {
  if (!corePromise) {
    corePromise = import("@tauri-apps/api/core").catch(() => null);
  }
  return corePromise;
}

/// Call a shell command. Rejects if the call fails.
export async function invoke(cmd, args) {
  if (!isDesktop()) throw new Error("Not running in the desktop app.");
  const mod = await core();
  if (!mod) throw new Error("The desktop bridge is unavailable.");
  return mod.invoke(cmd, args);
}

/// Call a shell command, returning `fallback` on any failure.
///
/// Used for the cache and session paths, where a failure means "no snapshot
/// available" — never something worth interrupting the user over.
export async function tryInvoke(cmd, args, fallback = null) {
  try {
    return await invoke(cmd, args);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// HTTP transport
// ---------------------------------------------------------------------------

/**
 * Is this the copy of the UI bundled inside the installer, rather than the live
 * site? True only when the app fell back for want of a network.
 */
export const isBundledUi = () =>
  isDesktop() &&
  typeof location !== "undefined" &&
  (location.protocol === "tauri:" || location.hostname === "tauri.localhost");

const browserFetch = (...args) => globalThis.fetch(...args);

let transportPromise = null;

/**
 * The function API requests should go through.
 *
 * The live site is an ordinary https origin, so browser fetch works and CORS is
 * already configured for it. The bundled fallback is served from
 * `tauri.localhost`, an origin the API has never heard of — and the desktop CSP
 * denies it outbound network access anyway. There, requests are issued from the
 * Rust process instead, which has no browser origin and so no preflight.
 *
 * Memoised as a promise rather than resolved lazily per call: an unawaited
 * import would let the first request race ahead on browser fetch and be blocked
 * by the CSP.
 */
export function transport() {
  if (transportPromise) return transportPromise;
  transportPromise = isBundledUi()
    ? import("@tauri-apps/plugin-http")
        .then((m) => m.fetch)
        .catch(() => browserFetch)
    : Promise.resolve(browserFetch);
  return transportPromise;
}

// ---------------------------------------------------------------------------
// Offline snapshot
// ---------------------------------------------------------------------------

/** Read a cached response. Returns `{ key, saved_at, body }` or null. */
export const cacheGet = (key) => tryInvoke("cache_get", { key });

/**
 * Read several cached responses at once. Returns the entries that exist, which
 * may be fewer than were asked for — and an empty array on any failure, so a
 * caller priming a cache never has to distinguish "nothing saved" from "the
 * bridge is unavailable".
 *
 * One call rather than a loop of `cacheGet`: this runs on the launch path,
 * where a dozen IPC round trips would cost the very delay it exists to remove.
 */
export const cacheGetMany = (keys) => tryInvoke("cache_get_many", { keys }, []);

/** Mirror a successful response to disk. Fire-and-forget. */
export const cachePut = (key, body) => tryInvoke("cache_put", { key, body });

/** `{ entries, bytes, newest, dir }` — powers the Settings panel. */
export const cacheInfo = () => tryInvoke("cache_info", undefined, null);

/** Wipe the snapshot. Returns the number of files removed. */
export const cacheClear = () => tryInvoke("cache_clear", undefined, 0);

// ---------------------------------------------------------------------------
// Session, shared across origins
// ---------------------------------------------------------------------------

export const secretGet = (key) => tryInvoke("secret_get", { key });
export const secretSet = (key, value) => tryInvoke("secret_set", { key, value });
export const secretDel = (key) => tryInvoke("secret_del", { key });

/**
 * Copy the session from the shell into this origin's localStorage.
 *
 * Called once before the app decides whether anyone is signed in. Without it,
 * the first launch after switching between the live and bundled UI would land
 * on the login screen despite a perfectly good session sitting on disk.
 *
 * Local storage wins when both exist — it is the origin the user just used.
 */
export async function hydrateSession(keys) {
  if (!isDesktop()) return false;
  let restored = false;

  for (const key of keys) {
    try {
      if (localStorage.getItem(key)) {
        // This origin is already the fresher copy; push it down instead.
        await secretSet(key, localStorage.getItem(key));
        continue;
      }
      const value = await secretGet(key);
      if (value) {
        localStorage.setItem(key, value);
        restored = true;
      }
    } catch {
      // A blocked or full localStorage is not a reason to fail startup.
    }
  }
  return restored;
}

/** Mirror a session value to disk so the other origin can pick it up. */
export function persistSession(key, value) {
  if (!isDesktop()) return;
  if (value === null || value === undefined) void secretDel(key);
  else void secretSet(key, value);
}

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------
//
// Tracked here rather than read from navigator.onLine, which only reports
// whether a network interface is up — it says "online" on a Wi-Fi network with
// no route to the internet. What the app actually cares about is whether the
// last request to our API succeeded, so that is what drives this.

let online = true;
let lastSyncedAt = 0;
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try {
      fn({ online, lastSyncedAt });
    } catch {
      // A broken subscriber must not stop the others from updating.
    }
  }
}

export function getConnectivity() {
  return { online, lastSyncedAt };
}

export function subscribeConnectivity(fn) {
  listeners.add(fn);
  fn({ online, lastSyncedAt });
  return () => listeners.delete(fn);
}

/** Record that a request reached the server. */
export function markOnline() {
  lastSyncedAt = Date.now();
  if (!online) {
    online = true;
    notify();
  }
}

/** Record that a request could not reach the server. */
export function markOffline() {
  if (online) {
    online = false;
    notify();
  }
}

/** Re-probe from Rust and update state. Backs the "Try again" button. */
export async function recheckConnectivity() {
  if (!isDesktop()) return online;
  const reachable = await tryInvoke("check_online", undefined, false);
  if (reachable) markOnline();
  else markOffline();
  return reachable;
}

// Seed from what the shell knew at launch, and remember when the snapshot on
// disk was last written so the banner can say how stale it is.
if (typeof window !== "undefined") {
  if (window.__WOLF_ONLINE__ === false) online = false;
  if (isDesktop()) {
    void cacheInfo().then((info) => {
      if (info?.newest) {
        lastSyncedAt = Math.max(lastSyncedAt, info.newest);
        notify();
      }
    });
  }
}
