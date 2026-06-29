import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/components/ui/Text';

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** Horizontal proportional bar + legend. Pure Views, instant render. */
export function StackedBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {segments.map((seg) => (
          <View
            key={seg.label}
            style={{ flex: seg.value / total, backgroundColor: seg.color }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text variant="caption" color="textSecondary">
              {seg.label}
            </Text>
            <Text variant="caption">{Math.round((seg.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: { gap: theme.spacing.md },
  track: {
    flexDirection: 'row',
    height: 12,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    gap: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
