"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME } from "@/lib/constants";

// Drop-in for public pages (marketing root, login, register): once a session
// is detected, send the user straight to their dashboard instead of leaving
// them on a "logged-out looking" page. Acts on the hydrated user immediately,
// so a "keep me signed in" session lands in the app on reopen — no extra click.
export default function RedirectIfAuthed() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(ROLE_HOME[user.role] || "/dashboard");
  }, [user, router]);

  return null;
}
