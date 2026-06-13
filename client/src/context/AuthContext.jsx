"use client";

import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { saveSession, clearSession, getStoredUser, setAuthCookie } from "@/lib/utils";
import { TOKEN_KEY } from "@/lib/constants";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until first hydration
  // One-shot demo disclaimer returned by the server on login/register
  // (first-login welcome, or "your data was wiped after 30 days idle").
  const [notice, setNotice] = useState(null);

  // Marks an intentional logout in progress. The dashboard route guard reads
  // this so that clearing the user doesn't bounce us to /login — logout sends
  // the user to the marketing landing page instead.
  const loggingOut = useRef(false);

  // Hydrate from storage on mount, then verify the token with the server.
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
        : null;

    // Backfill the middleware cookie for sessions created before it existed,
    // so the edge redirect works without requiring a fresh login. Persistent
    // if the token lives in localStorage ("remember me"), session-scoped if not.
    if (stored && token) {
      const remembered =
        typeof window !== "undefined" && !!localStorage.getItem(TOKEN_KEY);
      setAuthCookie(stored, remembered);
    }

    if (!token) {
      setLoading(false);
      return;
    }

    // We already have a cached user — render the app immediately and verify the
    // token in the BACKGROUND. This is the key to a fast load: we don't make the
    // user stare at a spinner while a (possibly cold-starting) backend answers
    // /auth/me. We only block when there's a token but no cached user to show.
    if (stored) setLoading(false);

    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch((err) => {
        // Only drop the session when the server actively rejects the token
        // (401 invalid/expired, 403 inactive account). A network failure
        // (status 0) or a server cold-start/5xx — common on free-tier hosting
        // that sleeps when idle — must NOT wipe a valid "remember me" session.
        // Keep the hydrated user; the next authenticated request will retry.
        if (err?.status === 401 || err?.status === 403) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials, remember = false) => {
    const res = await authApi.login(credentials);
    saveSession(res.token, res.user, remember);
    loggingOut.current = false;
    setUser(res.user);
    setNotice(res.notice || null);
    return res.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    saveSession(res.token, res.user, true);
    loggingOut.current = false;
    setUser(res.user);
    setNotice(res.notice || null);
    return res.user;
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  // Logging out returns the user to the landing page (not the login screen).
  const logout = useCallback(() => {
    loggingOut.current = true;
    clearSession();
    setUser(null);
    router.push("/");
  }, [router]);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    loggingOut,
    login,
    register,
    logout,
    notice,
    clearNotice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
