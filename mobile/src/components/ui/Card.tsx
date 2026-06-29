import { type ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PressableScale } from './PressableScale';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Elevated cards get a soft shadow; flat cards just a hairline border. */
  elevated?: boolean;
  padded?: boolean;
}

/** Surface container. Tappable when `onPress` is provided (animated press). */
export function Card({ children, onPress, style, elevated = false, padded = true }: Props) {
  styles.useVariants({ elevated });
  const content = (
    <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.pressWrap}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  pressWrap: { borderRadius: theme.radius.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    variants: {
      elevated: {
        true: {
          shadowColor: '#0B0F0E',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
        false: {},
      },
    },
  },
  padded: { padding: theme.spacing.lg },
}));
