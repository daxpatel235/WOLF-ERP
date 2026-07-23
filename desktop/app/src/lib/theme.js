// Theme constants shared by the server layout and the client toggle.
// Deliberately NOT a "use client" module: app/layout.jsx is a server component
// and needs the literal script string, not a client-module reference.

export const THEME_STORAGE_KEY = "wolf_theme";

/** The three things a user can pick. "system" follows the OS. */
export const THEMES = ["light", "dark", "system"];
export const DEFAULT_THEME = "system";

// ---------------------------------------------------------------------------
// Light-only routes
// ---------------------------------------------------------------------------
//
// The marketing pages are a designed, illustrated surface — hero artwork on a
// pale grid, product screenshots, brand gradients — not a token-based app UI.
// Flipping them to dark left the hero headline near-invisible (dark grey on a
// pale blue field) and the page half-light/half-dark, because the illustrations
// carry their own baked-in backgrounds that no token can follow.
//
// They are also the first thing a signed-out visitor sees, where the OS
// preference is a poor proxy for "how should this brochure look".
//
// So: the app honours the theme, the brochure stays light. Everything from
// /login inwards is token-based and themes properly.
const LIGHT_ONLY = ["/pricing", "/privacy", "/terms"];

export function isLightOnlyPath(pathname) {
  if (!pathname) return false;
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" || LIGHT_ONLY.some((p) => path === p || path.startsWith(p + "/"));
}

// ---------------------------------------------------------------------------
// Runtime helpers (browser only)
// ---------------------------------------------------------------------------

/** The user's stored choice, or the default when unset/invalid. */
export function getStoredTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEMES.includes(stored)) return stored;
  } catch {
    /* private mode — fall through to the default */
  }
  return DEFAULT_THEME;
}

/** Resolve "system" to a concrete light/dark using the OS preference. */
export function resolveTheme(choice = getStoredTheme()) {
  if (choice === "light" || choice === "dark") return choice;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Put the right class on <html> for this route.
 *
 * Takes the pathname because the answer is route-dependent: a light-only page
 * is light no matter what the user picked.
 */
export function applyTheme(pathname, choice = getStoredTheme()) {
  if (typeof document === "undefined") return "light";
  const effective = isLightOnlyPath(pathname) ? "light" : resolveTheme(choice);
  document.documentElement.classList.toggle("dark", effective === "dark");
  return effective;
}

// ---------------------------------------------------------------------------
// Pre-paint script
// ---------------------------------------------------------------------------

// Inlined into <head> so the `dark` class is set before first paint. Without
// it the page flashes the light palette before React hydrates.
//
// This duplicates the logic above rather than importing it: it has to run as a
// plain string in <head>, before any bundle has loaded. Keep the two in step —
// the route list and the storage key are the parts that matter.
export const themeScript = `
(function(){try{
  var p = location.pathname.replace(/\\/+$/,'') || '/';
  var lightOnly = p === '/' || /^\\/(pricing|privacy|terms)(\\/|$)/.test(p);
  if (lightOnly) { document.documentElement.classList.remove('dark'); return; }
  var t = localStorage.getItem('${THEME_STORAGE_KEY}');
  if (t !== 'light' && t !== 'dark') {
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.classList.toggle('dark', t === 'dark');
}catch(e){}})();
`;
