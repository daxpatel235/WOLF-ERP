import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { flattenPages, usePurchaseOrders } from '@/api/hooks';
import { DocRow } from '@/components/list/DocRow';
import { SearchHeader } from '@/components/list/SearchHeader';
import { EmptyState, PressableScale, Screen, Skeleton } from '@/components/ui';
import { money } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';
import type { DocStatus, PurchaseOrder } from '@/types/domain';

type Filter = DocStatus | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const debounced = useDebounced(search);

  const query = useMemo(
    () => ({ query: debounced, status: filter }),
    [debounced, filter],
  );
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePurchaseOrders(query);

  const orders = useMemo(() => flattenPages(data), [data]);
  const total = data?.pages[0]?.total;

  const renderItem = useCallback(
    ({ item }: { item: PurchaseOrder }) => (
      <DocRow
        number={item.number}
        title={item.vendorName}
        subtitle={`${item.items.length} items`}
        amount={money(item.total)}
        status={item.status}
        priority={item.priority}
        avatarName={item.vendorName}
        onPress={() => router.push(`/po/${item.id}`)}
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
        title="Purchase Orders"
        count={total}
        search={search}
        onSearch={setSearch}
        placeholder="Search PO or vendor…"
        filters={FILTERS}
        activeFilter={filter}
        onFilter={setFilter}
        right={
          <PressableScale scaleTo={0.92} style={styles.addBtn} onPress={() => router.push('/po/new')}>
            <Ionicons name="add" size={22} color={theme.colors.textOnPrimary} />
          </PressableScale>
        }
      />

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlashList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No purchase orders"
              message="Try a different search or filter."
            />
          }
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

function Separator() {
  return <View style={styles.separator} />;
}

function ListSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} height={74} radius={16} />
      ))}
    </View>
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
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.huge,
  },
  separator: { height: theme.spacing.sm },
  footer: { paddingVertical: theme.spacing.lg },
  skeletonWrap: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm },
}));
