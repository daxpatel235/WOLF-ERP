import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { flattenPages, useRfqs } from '@/api/hooks';
import { SearchHeader } from '@/components/list/SearchHeader';
import { Card, EmptyState, PressableScale, Screen, Skeleton, StatusPill, Text } from '@/components/ui';
import { shortDate } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';
import type { DocStatus, Rfq } from '@/types/domain';

type Filter = DocStatus | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'closed', label: 'Closed' },
  { key: 'awarded', label: 'Awarded' },
];

export default function RfqsScreen() {
  const { theme } = useUnistyles();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const debounced = useDebounced(search);
  const query = useMemo(() => ({ query: debounced, status: filter }), [debounced, filter]);

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useRfqs(query);
  const rfqs = useMemo(() => flattenPages(data), [data]);
  const total = data?.pages[0]?.total;

  const renderItem = useCallback(
    ({ item }: { item: Rfq }) => <RfqCard rfq={item} onPress={() => router.push(`/rfqs/${item.id}`)} />,
    [router],
  );
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <SearchHeader
        back
        title="RFQs"
        count={total}
        search={search}
        onSearch={setSearch}
        placeholder="Search title or category…"
        filters={FILTERS}
        activeFilter={filter}
        onFilter={setFilter}
        right={
          <PressableScale scaleTo={0.92} style={styles.addBtn} onPress={() => router.push('/rfqs/new')}>
            <Ionicons name="add" size={22} color={theme.colors.textOnPrimary} />
          </PressableScale>
        }
      />
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={16} />
          ))}
        </View>
      ) : (
        <FlashList
          data={rfqs}
          renderItem={renderItem}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No RFQs found" message="Create one to start collecting quotes." />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

const RfqCard = memo(function RfqCard({ rfq, onPress }: { rfq: Rfq; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <Text variant="caption" color="textSecondary">
          {rfq.number}
        </Text>
        <StatusPill status={rfq.status} />
      </View>
      <Text variant="bodyStrong" numberOfLines={2}>
        {rfq.title}
      </Text>
      <Text variant="caption" color="textSecondary">
        {rfq.category}
      </Text>
      <View style={styles.metaRow}>
        <View style={styles.meta}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
          <Text variant="caption" color="textSecondary">
            Due {shortDate(rfq.dueAt)}
          </Text>
        </View>
        <View style={styles.meta}>
          <Ionicons name="people-outline" size={13} color={theme.colors.textSecondary} />
          <Text variant="caption" color="textSecondary">
            {rfq.vendorCount} invited
          </Text>
        </View>
        <Text variant="caption" style={styles.quotes}>
          <Text variant="caption" color="text">
            {rfq.responsesCount}
          </Text>
          <Text variant="caption" color="textSecondary">
            /{rfq.vendorCount} quotes
          </Text>
        </Text>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create((theme) => ({
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  skeletonWrap: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm },
  sep: { height: theme.spacing.sm },
  footer: { paddingVertical: theme.spacing.lg },
  card: { gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quotes: { marginLeft: 'auto' },
}));
