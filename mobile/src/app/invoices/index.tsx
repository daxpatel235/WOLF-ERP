import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { flattenPages, useInvoices } from '@/api/hooks';
import { DocRow } from '@/components/list/DocRow';
import { SearchHeader } from '@/components/list/SearchHeader';
import { EmptyState, PressableScale, Screen, Skeleton } from '@/components/ui';
import { money, shortDate } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';
import type { DocStatus, Invoice } from '@/types/domain';

type Filter = DocStatus | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'partially_paid', label: 'Partially Paid' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

export default function InvoicesScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const debounced = useDebounced(search);
  const query = useMemo(() => ({ query: debounced, status: filter }), [debounced, filter]);

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInvoices(query);
  const rows = useMemo(() => flattenPages(data), [data]);
  const total = data?.pages[0]?.total;

  const renderItem = useCallback(
    ({ item }: { item: Invoice }) => (
      <DocRow
        number={item.number}
        title={item.vendorName}
        subtitle={`Due ${shortDate(item.dueAt)}`}
        amount={money(item.total)}
        status={item.status}
        avatarName={item.vendorName}
        onPress={() => router.push(`/invoices/${item.id}`)}
      />
    ),
    [router],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <SearchHeader
        back
        title="Invoices"
        count={total}
        search={search}
        onSearch={setSearch}
        placeholder="Search invoice or vendor…"
        filters={FILTERS}
        activeFilter={filter}
        onFilter={setFilter}
        right={
          <PressableScale
            scaleTo={0.92}
            style={styles.addBtn}
            onPress={() => router.push('/invoices/new')}
          >
            <Ionicons name="add" size={22} color={theme.colors.textOnPrimary} />
          </PressableScale>
        }
      />

      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} height={74} radius={16} />
          ))}
        </View>
      ) : (
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No invoices found" />}
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
}));
