"use client";

import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { authApi, teamApi } from "@/lib/api";
import { clearFetchCache } from "@/hooks/useFetch";
import {
  saveSession,
  clearSession,
  getStoredUser,
  setAuthCookie,
  isTokenExpired,
  saveSessionContext,
  getStoredContext,
} from "@/lib/utils";
import { TOKEN_KEY, USER_KEY, CONTEXT_KEY } from "@/lib/constants";
import { isDesktop, hydrateSession } from "@/lib/desktop";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until first hydration
  // The workspace the user belongs to, and the capabilities they actually hold
  // — the SAME answer the server enforces, so the UI can never offer an action
  // the API would reject. `null` while unknown (before the first /me lands).
  const [organization, setOrganization] = useState(null);
  const [permissions, setPermissions] = useState(null);
  // One-shot demo disclaimer returned by the server on login/register
  // (first-login welcome, or "your data was wiped after 30 days idle").
  const [notice, setNotice] = useState(null);

  // Marks an intentional logout in progress. The dashboard route guard reads
  // this so that clearing the user doesn't bounce us to /login — logout sends
  // the user to the marketing landing page instead.
  const loggingOut = useRef(false);

  // Hydrate from storage on mount, then verify the token with the server.
  useEffect(() => {
    let cancelled = false;

    // In the desktop app the session of record lives on disk, because the live
    // UI and the bundled offline copy are different origins with separate
    // localStorage. Pull it into this origin before reading any of it —
    // otherwise the first launch after switching between them looks like a
    // logout despite a perfectly good session sitting in AppData.
    const ready = isDesktop()
      ? hydrateSession([TOKEN_KEY, USER_KEY, CONTEXT_KEY])
      : Promise.resolve(false);

    ready.then(() => {
      if (!cancelled) hydrate();
    });

    return () => {
      cancelled = true;
    };

    function hydrate() {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
          : null;

      // The session is cached on this device, but we honour the 15-day rule:
      // no token, or one whose 15-day window has lapsed → wipe the stale cache
      // (storage + cookie) and start cleanly logged out. Doing this BEFORE we
      // trust the cached user prevents half-logged-in states (and the
      // landing-page flash) from an old session lingering in storage.
      if (!token || isTokenExpired(token)) {
        if (token) clearSession();
        setLoading(false);
        return;
      }

      const stored = getStoredUser();
      if (stored) {
        setUser(stored);
        // Restore the cached workspace + capabilities in the SAME pass as the
        // user. Without this the dashboard renders with permissions still null,
        // and `isOwner`/`can()` report false — so the owner's own screens tell
        // them they lack access until /me lands (or forever, if it fails).
        const storedContext = getStoredContext();
        if (storedContext) {
          setOrganization(storedContext.organization);
          setPermissions(storedContext.permissions);
        }
        // Refresh the middleware cookie (sliding 15-day window) so the edge
        // redirect keeps working for active users and backfills older sessions.
        const remembered =
          typeof window !== "undefined" && !!localStorage.getItem(TOKEN_KEY);
        setAuthCookie(stored, remembered);
        // Render immediately from cache; verify in the background (fast load).
        setLoading(false);
      }

      authApi
        .me()
        .then((res) => {
          if (cancelled) return;
          setUser(res.user);
          setOrganization(res.organization || null);
          setPermissions(res.permissions || {});
          saveSessionContext(res.organization || null, res.permissions || {});
        })
        .catch((err) => {
          // Only drop the session when the server actively rejects the token
          // (401 invalid/expired, 403 inactive account). A network failure
          // (status 0) or a server cold-start/5xx — common on free-tier hosting
          // that sleeps when idle — must NOT wipe a valid "remember me" session.
          // Keep the hydrated user; the next authenticated request will retry.
          //
          // Offline in the desktop app this rarely fires at all: /me is served
          // from the snapshot, so the app opens signed in with the workspace as
          // it was last seen.
          if (err?.status === 401 || err?.status === 403) {
            clearSession();
            clearFetchCache();
            setUser(null);
            setOrganization(null);
            setPermissions(null);
          }
        })
        .finally(() => setLoading(false));
    }
  }, []);

  // Adopt the workspace context the server returns alongside the user.
  const adoptSession = useCallback((res, remember) => {
    // Start every session with an empty cache: whoever was signed in before on
    // this device must leave nothing behind for the incoming account to see.
    clearFetchCache();
    saveSession(res.token, res.user, remember);
    loggingOut.current = false;
    setUser(res.user);
    setOrganization(res.organization || null);
    setPermissions(res.permissions || {});
    saveSessionContext(res.organization || null, res.permissions || {});
    setNotice(res.notice || null);
    return res.user;
  }, []);

  const login = useCallback(
    async (credentials, remember = false) => adoptSession(await authApi.login(credentials), remember),
    [adoptSession]
  );

  const register = useCallback(
    async (data) => adoptSession(await authApi.register(data), true),
    [adoptSession]
  );

  // Join an existing workspace from an emailed invitation. The server creates
  // the account inside the inviting org and signs them straight in.
  const acceptInvite = useCallback(
    async (data) => adoptSession(await teamApi.accept(data), true),
    [adoptSession]
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  // Logging out returns the user to the landing page (not the login screen).
  const logout = useCallback(() => {
    loggingOut.current = true;
    clearSession();
    // Cached responses belong to the account that fetched them — drop them so
    // the next sign-in on this device can never paint the previous user's data.
    clearFetchCache();
    setUser(null);
    setOrganization(null);
    setPermissions(null);
    router.push("/");
  }, [router]);

  // Mirrors the server's `can()` guard. Unknown (still loading) → false, so we
  // never flash an action the user may not have.
  const can = useCallback((permission) => permissions?.[permission] === true, [permissions]);

  // Re-read the workspace + permissions (e.g. after the owner changes settings).
  const refreshOrganization = useCallback(async () => {
    const res = await authApi.me();
    setOrganization(res.organization || null);
    setPermissions(res.permissions || {});
    saveSessionContext(res.organization || null, res.permissions || {});
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    loggingOut,
    login,
    register,
    acceptInvite,
    logout,
    notice,
    clearNotice,
    organization,
    permissions,
    can,
    isOwner: Boolean(organization?.isOwner),
    // Have we actually heard what this member may do? `can()` and `isOwner`
    // both return false while unknown, which is the safe default for HIDING an
    // action — but it must never be reported to the user as a denial. Gate any
    // "you don't have access" message on this being true.
    permissionsKnown: permissions !== null,
    refreshOrganization,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
