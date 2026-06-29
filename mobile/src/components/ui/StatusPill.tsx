import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';
import { statusMeta } from '@/lib/format';
import type { DocStatus } from '@/types/domain';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function StatusPill({ status }: { status: DocStatus }) {
  const meta = statusMeta[status];
  return <Pill tone={meta.tone} label={meta.label} />;
}

/** Solid colored badge — mirrors the web app's badgeClass (bg-*-100 / text-*-700). */
export function Pill({ tone, label }: { tone: Tone; label: string }) {
  styles.useVariants({ tone });
  return (
    <View style={styles.pill}>
      <Text variant="caption" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  pill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
    variants: {
      tone: {
        success: { backgroundColor: theme.colors.successSoft },
        warning: { backgroundColor: theme.colors.warningSoft },
        danger: { backgroundColor: theme.colors.dangerSoft },
        info: { backgroundColor: theme.colors.infoSoft },
        neutral: { backgroundColor: theme.colors.surfaceSunken },
      },
    },
  },
  label: {
    fontWeight: '600',
    variants: {
      tone: {
        success: { color: theme.colors.success },
        warning: { color: theme.colors.warning },
        danger: { color: theme.colors.danger },
        info: { color: theme.colors.info },
        neutral: { color: theme.colors.textSecondary },
      },
    },
  },
}));
