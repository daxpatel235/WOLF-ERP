import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

interface Props {
  children: ReactNode;
  /** Use the slightly sunken/alt background (e.g. list screens). */
  tone?: 'background' | 'surfaceAlt';
  edges?: Edge[];
  padded?: boolean;
  style?: ViewStyle;
}

/** Root container for every screen: themed background + safe-area handling. */
export function Screen({
  children,
  tone = 'background',
  edges = ['top', 'left', 'right'],
  padded = false,
  style,
}: Props) {
  styles.useVariants({ tone });
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create((theme) => ({
  safe: {
    flex: 1,
    variants: {
      tone: {
        background: { backgroundColor: theme.colors.background },
        surfaceAlt: { backgroundColor: theme.colors.surfaceAlt },
      },
    },
  },
  inner: { flex: 1 },
  padded: { paddingHorizontal: theme.spacing.lg },
}));
