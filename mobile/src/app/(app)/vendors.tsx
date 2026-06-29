import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { flattenPages, useVendors } from '@/api/hooks';
import { SearchHeader } from '@/components/list/SearchHeader';
import { Avatar, Card, EmptyState, PressableScale, Screen, Skeleton, StatusPill, Text } from '@/components/ui';
import { money, percent } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';
import type { DocStatus, Vendor } from '@/types/domain';

type Filter = DocStatus | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'inactive', label: 'Inactive' },
];

export default function VendorsScreen() {
  const { theme } = useUnistyles();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const debounced = useDebounced(search);
  const query = useMemo(() => ({ query: debounced, status: filter }), [debounced, filter]);

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useVendors(query);
  const vendors = useMemo(() => flattenPages(data), [data]);
  const total = data?.pages[0]?.total;

  const renderItem = useCallback(
    ({ item }: { item: Vendor }) => <VendorRow vendor={item} onPress={() => router.push(`/vendor/${item.id}`)} />,
    [router],
  );
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Screen>
      <SearchHeader
        title="Vendors"
        count={total}
        search={search}
        onSearch={setSearch}
        placeholder="Search name, category, city…"
        filters={FILTERS}
        activeFilter={filter}
        onFilter={setFilter}
        right={
          <PressableScale scaleTo={0.92} style={styles.addBtn} onPress={() => router.push('/vendor/new')}>
            <Ionicons name="add" size={22} color={theme.colors.textOnPrimary} />
          </PressableScale>
        }
      />
      {isLoading ? (
        <View style={styles.skeletonWrap}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} height={88} radius={16} />
          ))}
        </View>
      ) : (
        <FlashList
          data={vendors}
          renderItem={renderItem}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching && !isFetchingNextPage} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={<EmptyState icon="business-outline" title="No vendors found" message="Try a different search or filter." />}
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

const VendorRow = memo(function VendorRow({ vendor, onPress }: { vendor: Vendor; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Card onPress={onPress} style={styles.row}>
      <Avatar name={vendor.name} color={vendor.logoColor} size={46} />
      <View style={styles.main}>
        <View style={styles.nameRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {vendor.name}
          </Text>
          <StatusPill status={vendor.status} />
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {vendor.category} · {vendor.city}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Ionicons name="star" size={12} color={theme.colors.warning} />
            <Text variant="caption">{vendor.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.meta}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
            <Text variant="caption" color="textSecondary">
              {percent(vendor.onTimeRate)} on-time
            </Text>
          </View>
          <Text variant="caption" color="primary" style={styles.spend}>
            {money(vendor.totalSpend)}
          </Text>
        </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  main: { flex: 1, gap: 3 },
  flex: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spend: { marginLeft: 'auto', fontWeight: '600' },
}));
