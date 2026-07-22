// Misc client helpers: session storage + small utilities.

import { TOKEN_KEY, USER_KEY, CONTEXT_KEY, ROLE_HOME } from "./constants";

// Cookie read by middleware.js to redirect signed-in users away from public
// pages (/, /login, /register) at the EDGE — before any HTML paints, so there's
// no landing-page flash. It holds only the role's home path (no token/secrets).
const HOME_COOKIE = "wolf_home";

// Mirror the session into a cookie so the server/edge can see "is signed in"
// (localStorage is invisible to middleware). Persistent when "remember me",
// a session cookie otherwise — matching the storage choice below.
export function setAuthCookie(user, remember = false) {
  if (typeof window === "undefined") return;
  const home = ROLE_HOME[user?.role] || "/dashboard";
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 15}` : ""; // ~JWT lifetime
  document.cookie = `${HOME_COOKIE}=${encodeURIComponent(home)}; path=/; samesite=lax${maxAge}`;
}

export function clearAuthCookie() {
  if (typeof window === "undefined") return;
  document.cookie = `${HOME_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

// Persist the session. `remember` chooses localStorage (persistent) vs
// sessionStorage (cleared when the tab closes).
export function saveSession(token, user, remember = false) {
  if (typeof window === "undefined") return;
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
  // Avoid a stale copy in the other store.
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
  setAuthCookie(user, remember);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  [localStorage, sessionStorage].forEach((s) => {
    s.removeItem(TOKEN_KEY);
    s.removeItem(USER_KEY);
    s.removeItem(CONTEXT_KEY);
  });
  clearAuthCookie();
}

// Cache the workspace + capabilities the server reported for this member.
// Stored beside the user (same store, same lifetime) so a reload can answer
// "may I do this?" on the first render rather than after /me round-trips.
// This is a CACHE for rendering only — the server re-checks every request, so a
// tampered copy grants nothing.
export function saveSessionContext(organization, permissions) {
  if (typeof window === "undefined") return;
  // Follow the token: whichever store holds the session owns the context too.
  const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  store.setItem(CONTEXT_KEY, JSON.stringify({ organization, permissions }));
}

export function getStoredContext() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CONTEXT_KEY) || sessionStorage.getItem(CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Only trust a shape we recognise; anything else is treated as absent.
    if (!parsed || typeof parsed !== "object" || !parsed.permissions) return null;
    return { organization: parsed.organization || null, permissions: parsed.permissions };
  } catch {
    return null;
  }
}

// Is this JWT past its expiry? We read the `exp` claim (no signature check —
// the server still validates for real) purely to decide, on the device,
// whether the cached session is still within the 15-day window. A malformed
// token counts as expired so we clean it up. This is what enforces "keep the
// session on this device, but wipe it once the 15-day rule lapses".
export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false; // no expiry claim → treat as long-lived
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true; // unreadable → treat as expired so we clear it
  }
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Two-letter initials for an avatar bubble.
export function initialsOf(name = "") {
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

// "3 days ago" style relative time.
export function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/**
 * Save text content to a file. On Chromium browsers (Chrome/Edge) this opens
 * the native "Save As" dialog so the user picks the folder/filename. On other
 * browsers (Firefox/Safari) it falls back to a normal download into the
 * Downloads folder.
 * @returns {Promise<boolean>} false if the user cancelled the picker.
 */
export async function saveFile(filename, content, mime = "text/plain") {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";

  if (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: ext ? [{ description: `${ext.slice(1).toUpperCase()} file`, accept: { [mime]: [ext] } }] : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      if (e && e.name === "AbortError") return false; // user closed the dialog
      // Any other error (e.g. unsupported) → fall through to the fallback.
    }
  }

  // Fallback: trigger a regular browser download.
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}
