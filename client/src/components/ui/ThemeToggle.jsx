"use client";

// Dark-mode switch. The palette itself is the CSS-var block in globals.css —
// this only flips the `dark` class on <html>, so every token-based surface
// follows automatically.

import { useEffect, useState, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState("light");

  // Read the value the inline script already applied, so React's state agrees
  // with the DOM instead of fighting it.
  useEffect(() => {
    setThemeState(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — the toggle still works for this session */
    }
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const toggle = useCallback(
    () => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark"),
    [setTheme]
  );

  return { theme, setTheme, toggle };
}

export function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render a stable placeholder until mounted — the server can't know the
  // client's stored theme, and guessing causes a hydration mismatch.
  const dark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2 transition ${className}`}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

export default ThemeToggle;
