import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAiStatus, useAwardQuotation, useCompareQuotes, useComparableRfqs, useComparisonInsight } from '@/api/hooks';
import { AiButton, AiPanel, AiThinking } from '@/components/ai/AiKit';
import { Button, Card, EmptyState, NavHeader, Pill, PressableScale, Screen, Skeleton, StatusPill, Text } from '@/components/ui';
import { money } from '@/lib/format';

export default function CompareQuotesScreen() {
  const { rfq: rfqParam } = useLocalSearchParams<{ rfq?: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();

  const { data: rfqs, isLoading: loadingRfqs } = useComparableRfqs();
  const [rfqId, setRfqId] = useState<string | undefined>(rfqParam);

  useEffect(() => {
    if (!rfqId && rfqs && rfqs.length) setRfqId(rfqs[0].id);
  }, [rfqId, rfqs]);

  const { data: cmp, isLoading: loadingCmp } = useCompareQuotes(rfqId ?? '');
  const award = useAwardQuotation();
  const aiEnabled = useAiStatus().data?.enabled;
  const insight = useComparisonInsight();

  const onAward = (quotationId: string, vendor: string) => {
    Alert.alert('Award to ' + vendor, 'This awards the quote, rejects the others, and drafts a purchase order. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Award',
        onPress: async () => {
          try {
            const { po } = await award.mutateAsync(quotationId);
            router.replace(`/po/${po.id}`);
          } catch {
            Alert.alert('Error', 'Could not award this quotation.');
          }
        },
      },
    ]);
  };

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Compare quotes" subtitle={cmp?.rfqTitle} />

      {loadingRfqs ? (
        <View style={styles.content}>
          <Skeleton height={44} radius={12} />
          <Skeleton height={200} radius={16} />
        </View>
      ) : !rfqs || rfqs.length === 0 ? (
        <EmptyState icon="git-compare-outline" title="Nothing to compare" message="RFQs with two or more quotes show up here." />
      ) : (
        <>
          {/* RFQ selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipScroll}
          >
            {rfqs.map((r) => {
              const on = r.id === rfqId;
              return (
                <PressableScale
                  key={r.id}
                  haptic={false}
                  scaleTo={0.96}
                  onPress={() => {
                    setRfqId(r.id);
                    insight.reset();
                  }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text variant="caption" color={on ? 'textOnPrimary' : 'textSecondary'} style={styles.chipText}>
                    {r.number}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          {loadingCmp || !cmp ? (
            <View style={styles.content}>
              <Skeleton height={200} radius={16} />
              <Skeleton height={200} radius={16} />
            </View>
          ) : cmp.vendors.length === 0 ? (
            <EmptyState icon="document-outline" title="No quotes yet" message="No vendors have responded to this RFQ." />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {aiEnabled ? (
                insight.data ? (
                  <AiPanel title="AI award recommendation">
                    <Text variant="body">{insight.data.insight}</Text>
                  </AiPanel>
                ) : insight.isPending ? (
                  <AiPanel title="AI award recommendation">
                    <AiThinking label="Analysing the quotes…" />
                  </AiPanel>
                ) : (
                  <AiButton label="Get AI recommendation" onPress={() => insight.mutate(rfqId ?? '')} loading={insight.isPending} />
                )
              ) : null}
              {cmp.vendors.map((v, idx) => {
                const isLowest = v.amount === cmp.summary.lowestAmount;
                const isFastest = v.deliveryDays === cmp.summary.fastestDeliveryDays;
                const decided = v.status === 'awarded' || v.status === 'rejected';
                return (
                  <Animated.View key={v.quotationId} entering={FadeInDown.delay(idx * 60).duration(260)}>
                    <Card elevated={isLowest} style={[styles.vendorCard, isLowest && styles.vendorCardBest]}>
                      <View style={styles.vendorHead}>
                        <View style={styles.flex}>
                          <Text variant="bodyStrong" numberOfLines={1}>
                            {v.vendor}
                          </Text>
                          <View style={styles.badges}>
                            {isLowest ? <Pill label="Lowest price" tone="success" /> : null}
                            {isFastest ? <Pill label="Fastest" tone="info" /> : null}
                          </View>
                        </View>
                        <StatusPill status={v.status} />
                      </View>

                      <View style={styles.statRow}>
                        <View style={styles.stat}>
                          <Text variant="caption" color="textSecondary">
                            Total
                          </Text>
                          <Text variant="heading" color={isLowest ? 'success' : 'text'}>
                            {money({ amount: v.amount, currency: 'INR' })}
                          </Text>
                        </View>
                        <View style={styles.stat}>
                          <Text variant="caption" color="textSecondary">
                            Delivery
                          </Text>
                          <Text variant="heading" color={isFastest ? 'primary' : 'text'}>
                            {v.deliveryDays}d
                          </Text>
                        </View>
                      </View>

                      <View style={styles.priceList}>
                        {cmp.itemNames.map((name) => (
                          <View key={name} style={styles.priceRow}>
                            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
                              {name}
                            </Text>
                            <Text variant="caption">
                              {v.prices[name] != null ? money({ amount: v.prices[name], currency: 'INR' }) : '—'}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {decided ? (
                        <Button label={v.status === 'awarded' ? 'Awarded' : 'Rejected'} variant="secondary" disabled />
                      ) : (
                        <Button
                          label="Award this quote"
                          loading={award.isPending && award.variables === v.quotationId}
                          icon={<Ionicons name="trophy-outline" size={18} color={theme.colors.textOnPrimary} />}
                          onPress={() => onAward(v.quotationId, v.vendor)}
                        />
                      )}
                    </Card>
                  </Animated.View>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.huge, gap: theme.spacing.md, paddingTop: theme.spacing.md },
  chipScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, gap: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontWeight: '600' },
  vendorCard: { gap: theme.spacing.md, marginBottom: theme.spacing.md },
  vendorCardBest: { borderWidth: 1.5, borderColor: theme.colors.primary },
  vendorHead: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  badges: { flexDirection: 'row', gap: theme.spacing.xs, marginTop: 4, flexWrap: 'wrap' },
  statRow: { flexDirection: 'row', gap: theme.spacing.md },
  stat: { flex: 1, gap: 2 },
  priceList: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
}));
