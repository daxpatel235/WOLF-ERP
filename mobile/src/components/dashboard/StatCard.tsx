import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { tones } from '@/theme/tokens';

type Tone = keyof typeof tones;

interface Props {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  onPress?: () => void;
}

/**
 * Dashboard KPI card (two per row). Colored icon badge on top, a large bold
 * value, then the label. Every card is the same height and the value sits in a
 * fixed line box, so the four KPIs read as one consistent grid.
 */
export function StatCard({ label, value, icon, tone = 'blue', onPress }: Props) {
  const t = tones[tone];
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={[styles.iconBadge, { backgroundColor: t.soft, borderColor: t.ring }]}>
        <Ionicons name={icon} size={24} color={t.color} />
      </View>
      <View style={styles.valueRow}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={styles.value}>
          {value}
        </Text>
      </View>
      <Text variant="label" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { flex: 1, minHeight: 132 },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed line box keeps every value on the same baseline; short counts render
  // big while a long currency value shrinks just enough to fit (never truncates).
  valueRow: { marginTop: theme.spacing.md, height: 34, justifyContent: 'center' },
  value: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: theme.colors.text,
  },
}));
