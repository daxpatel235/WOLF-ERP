import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { flattenPages, useQuotations } from '@/api/hooks';
import { SearchHeader } from '@/components/list/SearchHeader';
import { Avatar, Card, EmptyState, PressableScale, Screen, Skeleton, StatusPill, Text } from '@/components/ui';
import { money, shortDate } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';
import type { DocStatus, Quotation } from '@/types/domain';

type Filter = DocStatus | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Received' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'awarded', label: 'Awarded' },
  { key: 'rejected', label: 'Rejected' },
];

export default function QuotationsScreen() {
  const { theme } = useUnistyles();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const debounced = useDebounced(search);
  const query = useMemo(() => ({ query: debounced, status: filter }), [debounced, filter]);

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useQuotations(query);
  const quotes = useMemo(() => flattenPages(data), [data]);
  const total = data?.pages[0]?.total;

  const renderItem = useCallback(
    ({ item }: { item: Quotation }) => <QuoteCard quote={item} onPress={() => router.push(`/quotations/${item.id}`)} />,
    [router],
  );
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <SearchHeader
        back
        title="Quotations"
        count={total}
        search={search}
        onSearch={setSearch}
        placeholder="Search vendor, quote or RFQ…"
        filters={FILTERS}
        activeFilter={filter}
        onFilter={setFilter}
        right={
          <PressableScale scaleTo={0.92} style={styles.compareBtn} onPress={() => router.push('/quotations/compare')}>
            <Ionicons name="git-compare-outline" size={20} color={theme.colors.textOnPrimary} />
          </PressableScale>
        }
      />
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={96} radius={16} />
          ))}
        </View>
      ) : (
        <FlashList
          data={quotes}
          renderItem={renderItem}
          keyExtractor={(q) => q.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={<EmptyState icon="pricetags-outline" title="No quotations found" message="Quotes from vendors will appear here." />}
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

const QuoteCard = memo(function QuoteCard({ quote, onPress }: { quote: Quotation; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Card onPress={onPress} style={styles.row}>
      <Avatar name={quote.vendorName} size={44} />
      <View style={styles.main}>
        <View style={styles.nameRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {quote.vendorName}
          </Text>
          <StatusPill status={quote.status} />
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {quote.number} · {quote.rfqTitle}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
            <Text variant="caption" color="textSecondary">
              {quote.deliveryDays}d delivery
            </Text>
          </View>
          <View style={styles.meta}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
            <Text variant="caption" color="textSecondary">
              valid till {shortDate(quote.validUntil)}
            </Text>
          </View>
          <Text variant="bodyStrong" color="primary" style={styles.amount}>
            {money(quote.total)}
          </Text>
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create((theme) => ({
  compareBtn: {
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
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  main: { flex: 1, gap: 3 },
  flex: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { marginLeft: 'auto' },
}));
