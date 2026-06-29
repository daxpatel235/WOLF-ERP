import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { flattenPages, useActivity, useApprovals, useDashboard } from '@/api/hooks';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, PriorityPill, PressableScale, Screen, Skeleton, Text } from '@/components/ui';
import { money, relativeTime } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { palette } from '@/theme/tokens';
import type { ActivityEvent } from '@/types/domain';

type IconName = keyof typeof Ionicons.glyphMap;

const QUICK_ACTIONS: { label: string; icon: IconName; href: string }[] = [
  { label: 'Add Vendor', icon: 'person-add-outline', href: '/vendor/new' },
  { label: 'Create RFQ', icon: 'document-text-outline', href: '/rfqs/new' },
  { label: 'New PO', icon: 'cart-outline', href: '/po/new' },
  { label: 'Generate Invoice', icon: 'receipt-outline', href: '/invoices/new' },
];

const ACTIVITY_ICON: Record<ActivityEvent['kind'], { icon: IconName; bg: string; fg: string }> = {
  approval: { icon: 'checkmark-circle', bg: palette.emerald100, fg: palette.emerald600 },
  invoice: { icon: 'receipt', bg: palette.violet100, fg: palette.violet600 },
  quotation: { icon: 'cube', bg: palette.sky100, fg: palette.sky600 },
  po: { icon: 'document-text', bg: palette.blue100, fg: palette.blue600 },
  rfq: { icon: 'document-text', bg: palette.blue100, fg: palette.blue600 },
  vendor: { icon: 'business', bg: palette.sky100, fg: palette.sky600 },
};

export default function DashboardScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const user = useAuth((s) => s.user);
  const isNewUser = useAuth((s) => s.isNewUser);
  const { data, isLoading, isRefetching, refetch } = useDashboard();
  const { data: activityData } = useActivity();
  const { data: approvals } = useApprovals();

  const recent = useMemo(() => flattenPages(activityData).slice(0, 6), [activityData]);
  const pending = useMemo(() => (approvals?.pending ?? []).slice(0, 3), [approvals]);
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text variant="title">
            {isNewUser ? 'Welcome' : 'Welcome back'}, {firstName} 👋
          </Text>
          <Text variant="body" color="textSecondary">
            Here&apos;s what&apos;s happening in your procurement pipeline today.
          </Text>
        </View>

        {/* Stats grid — two KPI cards per row */}
        {isLoading || !data ? (
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <Skeleton height={132} radius={16} />
              <Skeleton height={132} radius={16} />
            </View>
            <View style={styles.gridRow}>
              <Skeleton height={132} radius={16} />
              <Skeleton height={132} radius={16} />
            </View>
          </View>
        ) : (
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <StatCard label="Total Vendors" value={String(data.totalVendors)} icon="people-outline" tone="sky" onPress={() => router.push('/vendors')} />
              <StatCard label="Open RFQs" value={String(data.openRfqs)} icon="document-text-outline" tone="blue" onPress={() => router.push('/rfqs')} />
            </View>
            <View style={styles.gridRow}>
              <StatCard label="Pending Approvals" value={String(data.pendingApprovals)} icon="checkmark-done-outline" tone="violet" onPress={() => router.push('/approvals')} />
              <StatCard label="PO Value" value={money(data.poValue)} icon="cash-outline" tone="emerald" onPress={() => router.push('/reports')} />
            </View>
          </View>
        )}

        {/* Quick Actions (dark card) */}
        <View style={styles.quickCard}>
          <View style={styles.quickHead}>
            <Text variant="heading" color="textOnDark">
              Quick Actions
            </Text>
            <Text variant="caption" style={styles.quickSub}>
              Jump straight into what matters most
            </Text>
          </View>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((a) => (
              <PressableScale
                key={a.label}
                scaleTo={0.96}
                style={styles.quickBtn}
                onPress={() => router.push(a.href as never)}
              >
                <Ionicons name={a.icon} size={16} color={palette.white} />
                <Text variant="caption" color="textOnDark" style={styles.quickBtnLabel} numberOfLines={1}>
                  {a.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <Card padded={false}>
          <View style={styles.sectionHead}>
            <View style={styles.flex}>
              <Text variant="heading">Recent Activity</Text>
              <Text variant="caption" color="textSecondary">
                Latest procurement events
              </Text>
            </View>
            <PressableScale haptic={false} onPress={() => router.push('/activity')} style={styles.viewAll}>
              <Text variant="label" color="primary">
                View all
              </Text>
              <Ionicons name="arrow-forward" size={13} color={theme.colors.primary} />
            </PressableScale>
          </View>
          {recent.map((e, i) => {
            const meta = ACTIVITY_ICON[e.kind];
            return (
              <View key={e.id} style={[styles.activityRow, i > 0 && styles.rowBorder]}>
                <View style={[styles.activityIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.fg} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    <Text variant="bodyStrong">{e.actor}</Text> {e.action}
                  </Text>
                  <Text variant="caption" color="textSecondary" numberOfLines={1}>
                    {e.target}
                  </Text>
                </View>
                <Text variant="caption" color="textMuted">
                  {relativeTime(e.at)}
                </Text>
              </View>
            );
          })}
        </Card>

        {/* Pending Approvals */}
        <Card padded={false}>
          <View style={styles.sectionHead}>
            <View style={styles.flex}>
              <Text variant="heading">Pending Approvals</Text>
              <Text variant="caption" color="textSecondary">
                Awaiting your sign-off
              </Text>
            </View>
            <View style={styles.countPill}>
              <Text variant="caption" color="info">
                {pending.length} new
              </Text>
            </View>
          </View>
          <View style={styles.approvalsBody}>
            {pending.map((a) => (
              <PressableScale
                key={a.id}
                scaleTo={0.98}
                onPress={() => router.push('/approvals')}
                style={styles.approvalItem}
              >
                <View style={styles.approvalTop}>
                  <Text variant="bodyStrong">{a.docNumber}</Text>
                  <Text variant="bodyStrong">{money(a.amount)}</Text>
                </View>
                <View style={styles.approvalBottom}>
                  <PriorityPill priority={a.priority} />
                  <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
                    {a.requestedBy}
                  </Text>
                  <Text variant="caption" color="primary">
                    Review →
                  </Text>
                </View>
              </PressableScale>
            ))}
          </View>
          <PressableScale haptic={false} onPress={() => router.push('/approvals')} style={styles.viewAllBtn}>
            <Text variant="label" color="text">
              View all approvals
            </Text>
          </PressableScale>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.huge,
    gap: theme.spacing.xl,
  },
  flex: { flex: 1 },
  greeting: { gap: theme.spacing.xs, paddingTop: theme.spacing.xs },

  grid: { gap: theme.spacing.md },
  gridRow: { flexDirection: 'row', gap: theme.spacing.md },

  // Quick actions dark card
  quickCard: {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  quickHead: { gap: 2 },
  quickSub: { color: palette.slate400 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    width: '48%',
  },
  quickBtnLabel: { flex: 1 },

  // Section card headers
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Activity rows
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.surfaceSunken },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Approvals
  countPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.infoSoft,
  },
  approvalsBody: { padding: theme.spacing.md, gap: theme.spacing.sm },
  approvalItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  approvalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  approvalBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  viewAllBtn: {
    margin: theme.spacing.lg,
    marginTop: 0,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems: 'center',
  },
}));
