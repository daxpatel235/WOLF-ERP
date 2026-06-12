"use client";

import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { saveSession, clearSession, getStoredUser } from "@/lib/utils";
import { TOKEN_KEY } from "@/lib/constants";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until first hydration

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

    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        // Token invalid/expired — drop it.
        clearSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials, remember = false) => {
    const res = await authApi.login(credentials);
    saveSession(res.token, res.user, remember);
    loggingOut.current = false;
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    saveSession(res.token, res.user, false);
    loggingOut.current = false;
    setUser(res.user);
    return res.user;
  }, []);

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
