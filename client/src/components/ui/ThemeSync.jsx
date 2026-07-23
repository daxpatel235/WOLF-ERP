"use client";

// Keeps the <html> `dark` class correct as the user moves around.
//
// The inline script in <head> only runs on a full page load. Next.js client
// navigation doesn't reload the document, so without this, clicking from the
// dark dashboard back to the landing page would leave `dark` applied and paint
// the marketing hero in the broken half-dark state it was never designed for.
//
// Also re-resolves when the OS flips light/dark, so "System" is genuinely live
// rather than only correct at load.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, getStoredTheme } from "@/lib/theme";

export default function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(pathname);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      // Only "system" should follow the OS; an explicit choice stays put.
      if (getStoredTheme() === "system") applyTheme(pathname);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pathname]);

  return null;
}
