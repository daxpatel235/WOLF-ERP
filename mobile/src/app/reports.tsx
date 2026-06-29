import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, Share, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAiStatus, useDashboard, useReportSummary, useSpendByCategory, useSpendByVendor } from '@/api/hooks';
import { AiButton, AiPanel, AiThinking } from '@/components/ai/AiKit';
import { Avatar, Card, NavHeader, PressableScale, Screen, Skeleton, Text } from '@/components/ui';
import { money } from '@/lib/format';

export default function ReportsScreen() {
  const { theme } = useUnistyles();
  const { data: summary, isLoading, isRefetching, refetch } = useDashboard();
  const { data: categories } = useSpendByCategory();
  const { data: vendors } = useSpendByVendor();

  const aiEnabled = useAiStatus().data?.enabled;
  const aiSummary = useReportSummary();

  const cats = useMemo(() => categories ?? [], [categories]);
  const maxCat = useMemo(() => Math.max(1, ...cats.map((c) => c.amount)), [cats]);
  const totalSpend = useMemo(() => cats.reduce((t, c) => t + c.amount, 0), [cats]);
  const topVendors = useMemo(() => (vendors ?? []).slice(0, 5), [vendors]);

  const currency = summary?.poValue.currency ?? 'INR';

  const kpis: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone: string }[] = [
    { label: 'Total Spend', value: money({ amount: totalSpend, currency }), icon: 'wallet-outline', tone: theme.colors.info },
    { label: 'PO Value', value: summary ? money(summary.poValue) : '—', icon: 'cart-outline', tone: theme.colors.success },
    { label: 'Outstanding', value: summary ? money(summary.outstanding) : '—', icon: 'receipt-outline', tone: theme.colors.warning },
    { label: 'Active Vendors', value: summary ? String(summary.activeVendors) : '—', icon: 'people-outline', tone: theme.colors.primary },
  ];

  const onShare = async () => {
    const lines = ['Wolf ERP — Procurement Report', `Generated ${new Date().toLocaleString('en-IN')}`, ''];
    kpis.forEach((k) => lines.push(`${k.label}: ${k.value}`));
    lines.push('', 'Spend by category:');
    cats.forEach((c) => lines.push(`  ${c.category}: ${money({ amount: c.amount, currency })}`));
    lines.push('', 'Top vendors:');
    topVendors.forEach((v, i) => lines.push(`  ${i + 1}. ${v.vendor} — ${money({ amount: v.amount, currency })} (${v.orders} orders)`));
    await Share.share({ message: lines.join('\n'), title: 'Wolf ERP Report' });
  };

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader
        title="Reports"
        subtitle="Spend analytics & insights"
        right={
          <PressableScale haptic={false} style={styles.iconBtn} onPress={onShare}>
            <Ionicons name="share-outline" size={18} color={theme.colors.text} />
          </PressableScale>
        }
      />

      {isLoading ? (
        <View style={styles.content}>
          <View style={styles.gridRow}>
            <Skeleton height={108} radius={16} />
            <Skeleton height={108} radius={16} />
          </View>
          <Skeleton height={220} radius={16} />
          <Skeleton height={200} radius={16} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
        >
          {/* KPI grid 2×2 */}
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              {kpis.slice(0, 2).map((k) => (
                <Kpi key={k.label} {...k} />
              ))}
            </View>
            <View style={styles.gridRow}>
              {kpis.slice(2, 4).map((k) => (
                <Kpi key={k.label} {...k} />
              ))}
            </View>
          </View>

          {/* AI executive summary */}
          {aiEnabled ? (
            aiSummary.data ? (
              <AiPanel
                title="AI executive summary"
                footer={
                  <PressableScale haptic={false} onPress={() => aiSummary.mutate()}>
                    <Text variant="caption" color="primary">
                      {aiSummary.isPending ? 'Regenerating…' : 'Regenerate'}
                    </Text>
                  </PressableScale>
                }
              >
                <Text variant="body">{aiSummary.data.summary}</Text>
              </AiPanel>
            ) : aiSummary.isPending ? (
              <AiPanel title="AI executive summary">
                <AiThinking label="Summarising your procurement data…" />
              </AiPanel>
            ) : (
              <AiButton label="Summarise with AI" onPress={() => aiSummary.mutate()} loading={aiSummary.isPending} />
            )
          ) : null}

          {/* Spend by category — bar chart */}
          <Animated.View entering={FadeInDown.duration(260)}>
            <Card style={styles.card}>
              <View style={styles.cardHead}>
                <Text variant="heading">Spend by category</Text>
                <View style={styles.live}>
                  <Ionicons name="trending-up" size={13} color={theme.colors.textSecondary} />
                  <Text variant="caption" color="textSecondary">
                    live
                  </Text>
                </View>
              </View>
              {cats.length === 0 ? (
                <Text variant="caption" color="textSecondary" style={styles.emptyChart}>
                  No spend recorded yet.
                </Text>
              ) : (
                <View style={styles.barChart}>
                  {cats.slice(0, 7).map((c) => (
                    <View key={c.category} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { height: `${Math.max(4, (c.amount / maxCat) * 100)}%` }]} />
                      </View>
                      <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.barLabel}>
                        {c.category}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Category breakdown — progress bars */}
          <Card style={styles.card}>
            <Text variant="heading">Category breakdown</Text>
            {cats.length === 0 ? (
              <Text variant="caption" color="textSecondary">
                No data yet.
              </Text>
            ) : (
              <View style={styles.breakdown}>
                {cats.map((c) => (
                  <View key={c.category} style={styles.breakRow}>
                    <View style={styles.breakTop}>
                      <Text variant="body" color="textSecondary" numberOfLines={1} style={styles.flex}>
                        {c.category}
                      </Text>
                      <Text variant="bodyStrong">{money({ amount: c.amount, currency })}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${(c.amount / maxCat) * 100}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Top vendors */}
          <Card padded={false} style={styles.card}>
            <Text variant="heading" style={styles.vendorsHead}>
              Top vendors by spend
            </Text>
            {topVendors.length === 0 ? (
              <Text variant="caption" color="textSecondary" style={styles.vendorsEmpty}>
                No vendor spend yet.
              </Text>
            ) : (
              topVendors.map((v, i) => (
                <View key={v.vendorId || v.vendor} style={[styles.vendorRow, i > 0 && styles.rowBorder]}>
                  <Text variant="bodyStrong" color="textMuted" style={styles.rank}>
                    #{i + 1}
                  </Text>
                  <Avatar name={v.vendor} size={36} />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {v.vendor}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {v.orders} orders
                    </Text>
                  </View>
                  <Text variant="bodyStrong">{money({ amount: v.amount, currency })}</Text>
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone: string }) {
  return (
    <Card style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: tone + '1A' }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text variant="title" numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.huge, gap: theme.spacing.md, paddingTop: theme.spacing.md },
  grid: { gap: theme.spacing.md },
  gridRow: { flexDirection: 'row', gap: theme.spacing.md },
  kpi: { flex: 1, gap: theme.spacing.xs, minHeight: 108 },
  kpiIcon: { width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  card: { gap: theme.spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyChart: { paddingVertical: theme.spacing.xl, textAlign: 'center' },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm, height: 180 },
  barCol: { flex: 1, alignItems: 'center', gap: theme.spacing.sm, height: '100%' },
  barTrack: { flex: 1, width: '100%', maxWidth: 44, justifyContent: 'flex-end', alignSelf: 'center' },
  bar: { width: '100%', borderTopLeftRadius: theme.radius.sm, borderTopRightRadius: theme.radius.sm, backgroundColor: theme.colors.primary },
  barLabel: { maxWidth: '100%', textAlign: 'center' },
  breakdown: { gap: theme.spacing.md },
  breakRow: { gap: 6 },
  breakTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  progressTrack: { height: 8, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceSunken, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  vendorsHead: { padding: theme.spacing.lg, paddingBottom: theme.spacing.md },
  vendorsEmpty: { padding: theme.spacing.lg, paddingTop: 0, textAlign: 'center' },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  rank: { width: 26 },
}));
