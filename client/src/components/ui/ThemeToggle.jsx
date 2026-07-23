"use client";

// Dark-mode switch. The palette itself is the CSS-var block in globals.css —
// this only flips the `dark` class on <html>, so every token-based surface
// follows automatically.

import { useEffect, useState, useCallback } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  THEME_STORAGE_KEY as STORAGE_KEY,
  applyTheme,
  getStoredTheme,
  resolveTheme,
  isLightOnlyPath,
} from "@/lib/theme";
import { cn } from "@/lib/format";

/**
 * @returns choice   what the user picked: "light" | "dark" | "system"
 * @returns resolved what that actually means right now: "light" | "dark"
 */
export function useTheme() {
  const pathname = usePathname();
  const [choice, setChoiceState] = useState("system");
  const [resolved, setResolved] = useState("light");

  // Read what the inline script already applied, so React's state agrees with
  // the DOM instead of fighting it.
  useEffect(() => {
    setChoiceState(getStoredTheme());
    setResolved(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, [pathname]);

  const setTheme = useCallback(
    (next) => {
      setChoiceState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private mode — the toggle still works for this session */
      }
      setResolved(applyTheme(pathname, next));
    },
    [pathname]
  );

  // Quick switch: whatever is on screen now, show the other one. Resolves
  // "system" to a concrete choice, which is what someone clicking a sun/moon
  // is asking for.
  const toggle = useCallback(
    () => setTheme(resolveTheme(getStoredTheme()) === "dark" ? "light" : "dark"),
    [setTheme]
  );

  return { choice, resolved, theme: resolved, setTheme, toggle };
}

export function ThemeToggle({ className = "" }) {
  const pathname = usePathname();
  const { resolved, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render a stable placeholder until mounted — the server can't know the
  // client's stored theme, and guessing causes a hydration mismatch.
  const dark = mounted && resolved === "dark";

  // The marketing pages are light by design; offering a switch there would do
  // nothing visible and read as a broken control.
  if (isLightOnlyPath(pathname)) return null;

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

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Explicit three-way picker for Settings, where a toggle is too coarse. */
export function ThemePicker({ className = "" }) {
  const { choice, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("inline-flex items-center rounded-lg border border-border bg-surface p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition",
              active
                ? "bg-brand text-white shadow-sm shadow-brand/25"
                : "text-fg-muted hover:text-fg"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
