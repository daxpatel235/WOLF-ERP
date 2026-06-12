"use client";

import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

// Access the current auth state + actions. Must be used under <AuthProvider>.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}

export default useAuth;
