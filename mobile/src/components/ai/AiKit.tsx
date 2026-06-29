import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PressableScale, Text } from '@/components/ui';
import type { Tone } from '@/lib/format';
import { palette } from '@/theme/tokens';

/** Violet "ask AI" button with a built-in spinner — mirrors the web AiButton. */
export function AiButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <PressableScale haptic={false} scaleTo={0.97} onPress={onPress} disabled={loading || disabled} style={[styles.btn, (loading || disabled) && styles.btnDisabled]}>
      {loading ? (
        <ActivityIndicator size="small" color={palette.white} />
      ) : (
        <Ionicons name="sparkles" size={16} color={palette.white} />
      )}
      <Text variant="bodyStrong" style={styles.btnLabel}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Framed panel AI output renders into (violet border + sparkles header). */
export function AiPanel({ title = 'AI assistant', children, footer }: { title?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <View style={styles.panelBadge}>
          <Ionicons name="sparkles" size={13} color={palette.white} />
        </View>
        <Text variant="bodyStrong" style={styles.panelTitle}>
          {title}
        </Text>
      </View>
      <View>{children}</View>
      {footer ? <View style={styles.panelFooter}>{footer}</View> : null}
    </View>
  );
}

/** Inline loading row used while an AI request is in flight. */
export function AiThinking({ label = 'Thinking…' }: { label?: string }) {
  return (
    <View style={styles.thinking}>
      <ActivityIndicator size="small" color={palette.violet600} />
      <Text variant="body" style={styles.thinkingLabel}>
        {label}
      </Text>
    </View>
  );
}

/** Maps a risk/verdict level to a Pill tone (low/pass → success, etc.). */
export function levelTone(level = ''): Tone {
  const l = String(level).toLowerCase();
  if (/(low|pass|info)/.test(l)) return 'success';
  if (/(medium|review|warning)/.test(l)) return 'warning';
  if (/(high|fail|critical)/.test(l)) return 'danger';
  return 'neutral';
}

const styles = StyleSheet.create((theme) => ({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    height: 46,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: palette.violet600,
  },
  btnDisabled: { opacity: 0.55 },
  btnLabel: { color: palette.white },
  panel: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: palette.violet100,
    backgroundColor: palette.violet50,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  panelBadge: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.sm,
    backgroundColor: palette.violet600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: { color: palette.violet600 },
  panelFooter: { marginTop: theme.spacing.sm, paddingTop: theme.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.violet100 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  thinkingLabel: { color: palette.violet600 },
}));
