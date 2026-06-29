import { useEffect } from 'react';
import { type DimensionValue, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

interface Props {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** A single shimmering placeholder block. Animation runs on the UI thread. */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: Props) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: radius }, animatedStyle, style]}
    />
  );
}

/** Convenience: a stack of skeleton lines for list/detail placeholders. */
export function SkeletonGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create((theme) => ({
  block: { backgroundColor: theme.colors.skeleton },
  group: { gap: theme.spacing.md },
}));
