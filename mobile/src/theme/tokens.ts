/**
 * Wolf ERP design tokens — mirrors the web app exactly.
 * Brand: blue primary on warm paper (#fffdf7), white slate-bordered cards,
 * slate-900 dark accents. Tailwind slate/blue scale ported 1:1.
 */

// Raw palette (Tailwind values used by the web app) ---------------------------
const palette = {
  // Blue (primary)
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',

  // Accent tones used on stat cards / activity badges
  sky50: '#F0F9FF',
  sky100: '#E0F2FE',
  sky600: '#0284C7',
  violet50: '#F5F3FF',
  violet100: '#EDE9FE',
  violet600: '#7C3AED',
  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald600: '#059669',
  emerald700: '#047857',
  amber100: '#FEF3C7',
  amber600: '#D97706',
  amber700: '#B45309',
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red600: '#DC2626',
  red700: '#B91C1C',

  // Slate (neutrals)
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',

  // Surfaces
  paper: '#FFFDF7',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Spacing scale (4pt grid) ---------------------------------------------------
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

// Corner radii (matches Tailwind rounded-lg / xl / 2xl) ----------------------
export const radius = {
  none: 0,
  sm: 8, // rounded-lg (buttons, inputs)
  md: 12, // rounded-xl (inner items)
  lg: 16, // rounded-2xl (cards)
  xl: 20,
  pill: 999,
} as const;

// Typography ----------------------------------------------------------------
export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
} as const;

// Motion --------------------------------------------------------------------
export const motion = {
  springSnappy: { damping: 18, stiffness: 220, mass: 0.7 },
  springSoft: { damping: 20, stiffness: 140, mass: 0.9 },
  timingFast: 160,
  timingBase: 240,
} as const;

/** Stat-card / badge accent tones (soft bg + icon color + ring), per web colorMap. */
export const tones = {
  sky: { soft: palette.sky50, color: palette.sky600, ring: palette.sky100 },
  blue: { soft: palette.blue50, color: palette.blue600, ring: palette.blue100 },
  violet: { soft: palette.violet50, color: palette.violet600, ring: palette.violet100 },
  emerald: { soft: palette.emerald50, color: palette.emerald600, ring: palette.emerald100 },
} as const;

export { palette };
