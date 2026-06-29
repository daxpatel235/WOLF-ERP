// Custom entry point.
//
// Unistyles' `StyleSheet.configure()` MUST run before any `StyleSheet.create()`
// is evaluated. expo-router eagerly requires every route module while building
// its route tree, and in a production bundle it can evaluate a screen (which
// calls StyleSheet.create at import time) before the root `_layout` runs its
// `import '@/theme/unistyles'` side-effect — crashing release with
// "no theme has been selected yet". Importing the config here, before
// expo-router/entry, guarantees the theme is configured first.
import './src/theme/unistyles';
import 'expo-router/entry';
