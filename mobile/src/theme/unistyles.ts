/**
 * Unistyles 3 configuration — must be imported once, before any
 * `StyleSheet.create`. (Imported at the top of `src/app/_layout.tsx`.)
 *
 * The web app is light-only, so we ship a single light theme that mirrors it.
 */
import { StyleSheet } from 'react-native-unistyles';

import { motion, palette, radius, spacing, tones, typography } from './tokens';

const shared = { spacing, radius, typography, motion, tones } as const;

const lightTheme = {
  ...shared,
  name: 'light',
  colors: {
    // Surfaces
    background: palette.paper, // #fffdf7
    surface: palette.white,
    surfaceAlt: palette.slate50,
    surfaceSunken: palette.slate100,
    // Dark accent surfaces (e.g. Quick Actions gradient)
    dark: palette.slate900,
    darkAlt: palette.slate800,
    overlay: 'rgba(15,23,42,0.5)',

    // Text
    text: palette.slate900,
    textSecondary: palette.slate500,
    textMuted: palette.slate400,
    textInverse: palette.white,
    textOnPrimary: palette.white,
    textOnDark: palette.slate100,

    // Brand (blue)
    primary: palette.blue600,
    primaryStrong: palette.blue700,
    primarySoft: palette.blue50,
    primaryText: palette.blue600,

    // Lines
    border: palette.slate200,
    borderStrong: palette.slate300,

    // Status (badge bg = *Soft, text/icon = base), matches web badgeClass
    success: palette.emerald700,
    successSoft: palette.emerald100,
    warning: palette.amber700,
    warningSoft: palette.amber100,
    danger: palette.red700,
    dangerSoft: palette.red100,
    info: palette.blue700,
    infoSoft: palette.blue100,

    skeleton: palette.slate200,
  },
} as const;

const appThemes = {
  light: lightTheme,
};

const breakpoints = {
  xs: 0, // required base breakpoint
  sm: 360,
  md: 480,
  lg: 768,
  xl: 1024,
} as const;

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends AppThemes {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: appThemes,
  breakpoints,
  settings: {
    // Web app is light-only — pin the theme to match.
    initialTheme: 'light',
  },
});
