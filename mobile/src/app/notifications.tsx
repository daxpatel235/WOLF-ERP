import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { flattenPages, useActivity, useApprovals } from '@/api/hooks';
import { Card, EmptyState, PressableScale, PriorityPill, Screen, Skeleton, Text } from '@/components/ui';
import { money, relativeTime } from '@/lib/format';
import { palette } from '@/theme/tokens';
import type { ActivityEvent } from '@/types/domain';

type IconName = keyof typeof Ionicons.glyphMap;

const ACTIVITY_ICON: Record<ActivityEvent['kind'], { icon: IconName; bg: string; fg: string }> = {
  approval: { icon: 'checkmark-circle', bg: palette.emerald100, fg: palette.emerald600 },
  invoice: { icon: 'receipt', bg: palette.violet100, fg: palette.violet600 },
  quotation: { icon: 'pricetag', bg: palette.sky100, fg: palette.sky600 },
  po: { icon: 'cart', bg: palette.blue100, fg: palette.blue600 },
  rfq: { icon: 'document-text', bg: palette.blue100, fg: palette.blue600 },
  vendor: { icon: 'business', bg: palette.sky100, fg: palette.sky600 },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { data: activityData, isLoading: loadingActivity } = useActivity();
  const { data: approvals, isLoading: loadingApprovals } = useApprovals();

  const events = useMemo(() => flattenPages(activityData).slice(0, 20), [activityData]);
  const pending = useMemo(() => approvals?.pending ?? [], [approvals]);
  const loading = loadingActivity || loadingApprovals;
  const isEmpty = !loading && pending.length === 0 && events.length === 0;

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="title">Notifications</Text>
          <Text variant="caption" color="textSecondary">
            {pending.length > 0 ? `${pending.length} awaiting your action` : 'You’re all caught up'}
          </Text>
        </View>
        <PressableScale haptic={false} style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </PressableScale>
      </View>

      {loading ? (
        <View style={styles.content}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={12} />
          ))}
        </View>
      ) : isEmpty ? (
        <EmptyState icon="notifications-off-outline" title="No notifications" message="New activity and approvals will show up here." />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Needs action */}
          {pending.length > 0 && (
            <View style={styles.section}>
              <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
                NEEDS ACTION
              </Text>
              {pending.map((a, i) => (
                <Animated.View key={a.id} entering={FadeInDown.delay(i * 50).duration(240)}>
                  <Card onPress={() => router.push('/approvals')} style={styles.actionCard}>
                    <View style={[styles.iconBadge, { backgroundColor: theme.colors.warningSoft }]}>
                      <Ionicons name="alert-circle" size={20} color={theme.colors.warning} />
                    </View>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        Approval requested · {a.docNumber}
                      </Text>
                      <Text variant="caption" color="textSecondary" numberOfLines={1}>
                        {a.requestedBy} · {money(a.amount)}
                      </Text>
                    </View>
                    <View style={styles.actionRight}>
                      <PriorityPill priority={a.priority} />
                      <Text variant="caption" color="textMuted">
                        {relativeTime(a.requestedAt)}
                      </Text>
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </View>
          )}

          {/* Recent activity */}
          {events.length > 0 && (
            <View style={styles.section}>
              <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
                RECENT ACTIVITY
              </Text>
              <Card padded={false}>
                {events.map((e, i) => {
                  const meta = ACTIVITY_ICON[e.kind];
                  return (
                    <View key={e.id} style={[styles.activityRow, i > 0 && styles.rowBorder]}>
                      <View style={[styles.activityIcon, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={16} color={meta.fg} />
                      </View>
                      <View style={styles.flex}>
                        <Text variant="body" numberOfLines={2}>
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
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  closeBtn: { width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.huge, gap: theme.spacing.lg },
  section: { gap: theme.spacing.sm },
  sectionLabel: { letterSpacing: 0.5, paddingHorizontal: theme.spacing.xs },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  iconBadge: { width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  actionRight: { alignItems: 'flex-end', gap: 4 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.surfaceSunken },
  activityIcon: { width: 38, height: 38, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
}));
