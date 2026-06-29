import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { PriorityPill } from '@/components/ui/PriorityPill';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import type { DocStatus, Priority } from '@/types/domain';

interface Props {
  number: string;
  title: string;
  subtitle?: string;
  amount?: string;
  status: DocStatus;
  priority?: Priority;
  avatarName?: string;
  avatarColor?: string;
  onPress?: () => void;
}

/**
 * Generic document row used by every list. Memoized so FlashList cell recycling
 * never re-renders an unchanged row — key to jank-free fast scrolling.
 */
export const DocRow = memo(function DocRow({
  number,
  title,
  subtitle,
  amount,
  status,
  priority,
  avatarName,
  avatarColor,
  onPress,
}: Props) {
  const { theme } = useUnistyles();
  return (
    <Card onPress={onPress} style={styles.row}>
      {avatarName ? (
        <Avatar name={avatarName} color={avatarColor} size={42} />
      ) : null}
      <View style={styles.main}>
        <View style={styles.topLine}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {title}
          </Text>
          {amount ? <Text variant="bodyStrong">{amount}</Text> : null}
        </View>
        <View style={styles.bottomLine}>
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
            {number}
            {subtitle ? ` · ${subtitle}` : ''}
          </Text>
          <View style={styles.pills}>
            {priority ? <PriorityPill priority={priority} /> : null}
            <StatusPill status={status} />
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </Card>
  );
});

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  main: { flex: 1, gap: 6 },
  flex: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  bottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
