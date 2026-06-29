import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useRfq } from '@/api/hooks';
import {
  Button,
  Card,
  NavHeader,
  PressableScale,
  Screen,
  Skeleton,
  StatusPill,
  Text,
} from '@/components/ui';
import { money, shortDate } from '@/lib/format';
import type { Quotation } from '@/types/domain';

export default function RfqDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { data, isLoading } = useRfq(id);

  const rfq = data?.rfq;
  const quotes = data?.quotes ?? [];

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title={rfq?.number ?? 'RFQ'} subtitle={rfq ? rfq.category : undefined} />

      {isLoading || !rfq ? (
        <View style={styles.content}>
          <Skeleton height={90} radius={16} />
          <Skeleton height={160} radius={16} />
          <Skeleton height={160} radius={16} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Animated.View entering={FadeInDown.duration(260)}>
              <Card elevated style={styles.headCard}>
                <View style={styles.headTop}>
                  <Text variant="heading" style={styles.flex}>
                    {rfq.title}
                  </Text>
                  <StatusPill status={rfq.status} />
                </View>
                <View style={styles.metaGrid}>
                  <Meta label="Created" value={shortDate(rfq.createdAt)} />
                  <Meta label="Response deadline" value={shortDate(rfq.dueAt)} />
                  <Meta label="Vendors invited" value={String(rfq.vendorCount)} />
                  <Meta label="Quotes received" value={String(rfq.responsesCount)} />
                </View>
              </Card>
            </Animated.View>

            {/* Requested items */}
            <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
              REQUESTED ITEMS
            </Text>
            <Card padded={false}>
              {rfq.items.map((it, idx) => (
                <View key={idx} style={[styles.itemRow, idx > 0 && styles.rowBorder]}>
                  <Ionicons name="cube-outline" size={16} color={theme.colors.textSecondary} />
                  <Text variant="body" style={styles.flex} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {it.quantity} {it.unit}
                  </Text>
                </View>
              ))}
            </Card>

            {/* Quotes received */}
            <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
              QUOTES RECEIVED ({quotes.length})
            </Text>
            <Card padded={false}>
              {quotes.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text variant="caption" color="textSecondary">
                    No quotes submitted yet.
                  </Text>
                </View>
              ) : (
                quotes.map((q: Quotation, idx) => (
                  <PressableScale
                    key={q.id}
                    haptic={false}
                    scaleTo={0.99}
                    onPress={() => router.push(`/quotations/${q.id}`)}
                    style={[styles.quoteRow, idx > 0 && styles.rowBorder]}
                  >
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{q.vendorName}</Text>
                      <Text variant="caption" color="textSecondary">
                        {q.deliveryDays} days · valid till {shortDate(q.validUntil)}
                      </Text>
                    </View>
                    <View style={styles.quoteRight}>
                      <Text variant="bodyStrong">{money(q.total)}</Text>
                      <StatusPill status={q.status} />
                    </View>
                  </PressableScale>
                ))
              )}
            </Card>
          </ScrollView>

          {quotes.length > 1 ? (
            <View style={styles.actionBar}>
              <Button
                label="Compare quotes"
                icon={<Ionicons name="git-compare-outline" size={18} color={theme.colors.textOnPrimary} />}
                onPress={() => router.push(`/quotations/compare?rfq=${rfq.id}`)}
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: 100, gap: theme.spacing.md, paddingTop: theme.spacing.md },
  headCard: { gap: theme.spacing.lg },
  headTop: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  meta: { width: '50%', paddingVertical: theme.spacing.xs, gap: 2 },
  sectionLabel: { marginTop: theme.spacing.sm, letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.lg },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  emptyRow: { padding: theme.spacing.lg },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg },
  quoteRight: { alignItems: 'flex-end', gap: 4 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
}));
