import { Text as RNText, type TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { typography } from '@/theme/tokens';

type Variant = keyof typeof typography;
type ColorToken =
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'primary'
  | 'primaryText'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'textOnPrimary'
  | 'textOnDark';

interface Props extends TextProps {
  variant?: Variant;
  color?: ColorToken;
  center?: boolean;
}

/** Themed text bound to the typography scale + color tokens. */
export function Text({ variant = 'body', color = 'text', center, style, ...rest }: Props) {
  styles.useVariants({ variant, color });
  return <RNText {...rest} style={[styles.base, center && styles.center, style]} />;
}

const styles = StyleSheet.create((theme) => ({
  base: {
    variants: {
      variant: {
        display: theme.typography.display,
        title: theme.typography.title,
        heading: theme.typography.heading,
        body: theme.typography.body,
        bodyStrong: theme.typography.bodyStrong,
        label: theme.typography.label,
        caption: theme.typography.caption,
        mono: theme.typography.mono,
      },
      color: {
        text: { color: theme.colors.text },
        textSecondary: { color: theme.colors.textSecondary },
        textMuted: { color: theme.colors.textMuted },
        primary: { color: theme.colors.primary },
        primaryText: { color: theme.colors.primaryText },
        danger: { color: theme.colors.danger },
        success: { color: theme.colors.success },
        warning: { color: theme.colors.warning },
        info: { color: theme.colors.info },
        textOnPrimary: { color: theme.colors.textOnPrimary },
        textOnDark: { color: theme.colors.textOnDark },
      },
    },
  },
  center: { textAlign: 'center' },
}));
