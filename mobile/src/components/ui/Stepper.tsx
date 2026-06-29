import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Text } from './Text';

interface Props {
  steps: string[];
  current: number;
}

/** Numbered step indicator for multi-step forms (RFQ wizard). */
export function Stepper({ steps, current }: Props) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.row}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.item}>
            <View
              style={[
                styles.bubble,
                done && { backgroundColor: theme.colors.success },
                active && { backgroundColor: theme.colors.primary },
                !done && !active && { backgroundColor: theme.colors.surfaceSunken },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={14} color={theme.colors.textOnPrimary} />
              ) : (
                <Text variant="caption" color={active ? 'textOnPrimary' : 'textSecondary'} style={styles.num}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text variant="label" color={active ? 'text' : 'textSecondary'} numberOfLines={1}>
              {label}
            </Text>
            {i < steps.length - 1 ? <View style={styles.line} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flex: 1 },
  bubble: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  num: { fontWeight: '700' },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginHorizontal: 4 },
}));
