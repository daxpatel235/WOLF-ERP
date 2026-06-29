import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}

/** Back-navigation header for detail and form screens. */
export function NavHeader({ title, subtitle, right, onBack }: Props) {
  const router = useRouter();
  const { theme } = useUnistyles();
  return (
    <View style={styles.bar}>
      <PressableScale
        onPress={onBack ?? (() => router.back())}
        style={styles.btn}
        scaleTo={0.9}
        haptic={false}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
      </PressableScale>
      <View style={styles.titleWrap}>
        <Text variant="heading" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  btn: { width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
}));
