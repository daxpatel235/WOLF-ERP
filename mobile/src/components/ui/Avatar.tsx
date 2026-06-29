import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';
import { initials } from '@/lib/format';
import { palette } from '@/theme/tokens';

interface Props {
  name: string;
  color?: string;
  size?: number;
}

/** Colored monogram avatar (no image dependency, instant render). */
export function Avatar({ name, color, size = 44 }: Props) {
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 4, backgroundColor: color ?? palette.slate700 },
      ]}
    >
      <Text variant="label" color="textOnPrimary" style={{ fontSize: size * 0.34 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  base: { alignItems: 'center', justifyContent: 'center' },
}));
