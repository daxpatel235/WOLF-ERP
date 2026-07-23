/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ----------------------------------------------------------------
      // Semantic token system. Neutrals flip via the CSS vars in
      // globals.css; the brand stays constant. Everything here is
      // ADDITIVE — the existing slate/blue utility classes are untouched,
      // so pages migrate to tokens one at a time.
      // ----------------------------------------------------------------
      colors: {
        // Brand = blue-600, the Wolf accent. Changing these ten values
        // reskins every component that references `brand`/`brand-*`.
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
        },
        // Secondary accent (violet) — AI surfaces and secondary emphasis,
        // never primary CTAs.
        accent: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          DEFAULT: "#7c3aed",
          dark: "#6d28d9",
        },
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        "fg-muted": "rgb(var(--fg-muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
      },
      boxShadow: {
        // Soft, low-contrast elevation — cards stay mostly flat and
        // border-led; popovers lift. Avoids the heavy "template" shadow.
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover":
          "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.06)",
        pop: "0 12px 32px -12px rgb(15 23 42 / 0.28)",
        glow: "0 0 0 1px rgb(37 99 235 / 0.12), 0 8px 24px -8px rgb(37 99 235 / 0.35)",
      },
      transitionTimingFunction: {
        // Gentle spring-out for hovers & entrances.
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "chat-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "none" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "none" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "chat-in": "chat-in 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        "slide-in": "slide-in 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
