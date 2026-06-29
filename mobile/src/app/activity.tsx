import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo } from 'react';
import { RefreshControl, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { flattenPages, useActivity } from '@/api/hooks';
import { NavHeader, Screen, Skeleton, Text } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import type { ActivityEvent } from '@/types/domain';

type IconName = keyof typeof Ionicons.glyphMap;
const KIND: Record<ActivityEvent['kind'], { icon: IconName; tone: string }> = {
  po: { icon: 'receipt-outline', tone: '#059669' },
  invoice: { icon: 'card-outline', tone: '#3B82F6' },
  quotation: { icon: 'pricetag-outline', tone: '#D97706' },
  rfq: { icon: 'document-text-outline', tone: '#8B5CF6' },
  vendor: { icon: 'business-outline', tone: '#0891B2' },
  approval: { icon: 'checkmark-done-outline', tone: '#059669' },
};

export default function ActivityScreen() {
  const { theme } = useUnistyles();
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivity();
  const events = useMemo(() => flattenPages(data), [data]);

  const renderItem = useCallback(({ item }: { item: ActivityEvent }) => <Row event={item} />, []);
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Activity" subtitle="Most recent first" />
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} height={52} radius={12} />
          ))}
        </View>
      ) : (
        <FlashList
          data={events}
          renderItem={renderItem}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.listContent}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
        />
      )}
    </Screen>
  );
}

const Row = memo(function Row({ event }: { event: ActivityEvent }) {
  const meta = KIND[event.kind];
  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <View style={[styles.iconDot, { backgroundColor: meta.tone + '22' }]}>
          <Ionicons name={meta.icon} size={15} color={meta.tone} />
        </View>
        <View style={styles.connector} />
      </View>
      <View style={styles.content}>
        <Text variant="body" numberOfLines={2}>
          <Text variant="bodyStrong">{event.actor}</Text>
          {` ${event.action} `}
          <Text variant="bodyStrong" color="primary">
            {event.target}
          </Text>
        </Text>
        <Text variant="caption" color="textSecondary">
          {relativeTime(event.at)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  skeletonWrap: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md },
  row: { flexDirection: 'row', gap: theme.spacing.md },
  timeline: { alignItems: 'center', width: 32 },
  iconDot: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: { flex: 1, width: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginVertical: 4 },
  content: { flex: 1, paddingBottom: theme.spacing.lg, gap: 2 },
}));
