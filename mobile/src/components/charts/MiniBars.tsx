import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface Props {
  data: number[];
  height?: number;
  /** Highlight the last bar (current period). */
  accentLast?: boolean;
}

/**
 * A lightweight bar sparkline built from Views — no SVG dependency, GPU-cheap,
 * with a staggered entering animation on the UI thread.
 */
export function MiniBars({ data, height = 64, accentLast = true }: Props) {
  const { theme } = useUnistyles();
  const max = Math.max(...data, 1);
  return (
    <View style={[styles.row, { height }]}>
      {data.map((v, i) => {
        const isAccent = accentLast && i === data.length - 1;
        return (
          <Animated.View
            key={i}
            entering={FadeInUp.delay(i * 28).springify().damping(16)}
            style={[
              styles.bar,
              {
                height: Math.max(4, (v / max) * height),
                backgroundColor: isAccent ? theme.colors.primary : theme.colors.primarySoft,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  bar: {
    flex: 1,
    borderRadius: 4,
  },
}));
