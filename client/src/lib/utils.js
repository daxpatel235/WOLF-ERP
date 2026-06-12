// Misc client helpers: session storage + small utilities.

import { TOKEN_KEY, USER_KEY } from "./constants";

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
}

export function clearSession() {
  if (typeof window === "undefined") return;
  [localStorage, sessionStorage].forEach((s) => {
    s.removeItem(TOKEN_KEY);
    s.removeItem(USER_KEY);
  });
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
