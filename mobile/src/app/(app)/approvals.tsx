import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useApprovals, useDecideApproval } from '@/api/hooks';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  PriorityPill,
  PressableScale,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { money, relativeTime, shortDate } from '@/lib/format';
import type { Approval } from '@/types/domain';

type IconName = keyof typeof Ionicons.glyphMap;

const DOC_META: Record<Approval['docType'], { label: string; icon: IconName }> = {
  purchase_order: { label: 'Purchase Order', icon: 'cart-outline' },
  invoice: { label: 'Invoice', icon: 'receipt-outline' },
  rfq: { label: 'RFQ', icon: 'document-text-outline' },
};

function hrefFor(a: Approval): string {
  if (a.docType === 'purchase_order') return `/po/${a.refId}`;
  if (a.docType === 'invoice') return `/invoices/${a.refId}`;
  return `/rfqs/${a.refId}`;
}

export default function ApprovalsScreen() {
  const { theme } = useUnistyles();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useApprovals();
  const decide = useDecideApproval();

  const pending = data?.pending ?? [];
  const decided = data?.decided ?? [];

  return (
    <Screen tone="surfaceAlt">
      <View style={styles.header}>
        <Text variant="title">Approvals</Text>
        <Text variant="body" color="textSecondary">
          {pending.length} awaiting your decision
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.body}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={160} radius={16} />
          ))}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />
          }
        >
          {pending.length === 0 ? (
            <View style={styles.empty}>
              <EmptyState
                icon="checkmark-done-circle-outline"
                title="All caught up"
                message="No approvals are waiting on you right now."
              />
            </View>
          ) : (
            pending.map((a) => {
              const meta = DOC_META[a.docType];
              return (
                <Animated.View
                  key={a.id}
                  entering={FadeIn}
                  exiting={FadeOutRight.duration(220)}
                  layout={LinearTransition.springify().damping(18)}
                >
                  <Card elevated style={styles.card}>
                    <View style={styles.cardHead}>
                      <View style={[styles.typeIcon, { backgroundColor: theme.colors.infoSoft }]}>
                        <Ionicons name={meta.icon} size={18} color={theme.colors.info} />
                      </View>
                      <View style={styles.flex}>
                        <PressableScale haptic={false} onPress={() => router.push(hrefFor(a) as never)}>
                          <Text variant="bodyStrong" color="primary">
                            {a.docNumber}
                          </Text>
                        </PressableScale>
                        <Text variant="caption" color="textSecondary" numberOfLines={1}>
                          {meta.label}
                          {a.vendorName && a.vendorName !== '—' ? ` · ${a.vendorName}` : ''} · by {a.requestedBy}
                        </Text>
                      </View>
                      <PriorityPill priority={a.priority} />
                    </View>

                    <View style={styles.amountRow}>
                      <Text variant="caption" color="textSecondary">
                        {relativeTime(a.requestedAt)}
                      </Text>
                      <Text variant="heading">{money(a.amount)}</Text>
                    </View>

                    <View style={styles.actions}>
                      <View style={styles.flex}>
                        <Button
                          label="Approve"
                          variant="primary"
                          icon={<Ionicons name="checkmark" size={18} color="#fff" />}
                          onPress={() => decide.mutate({ id: a.id, decision: 'approved' })}
                        />
                      </View>
                      <View style={styles.flex}>
                        <Button
                          label="Reject"
                          variant="secondary"
                          onPress={() => decide.mutate({ id: a.id, decision: 'rejected' })}
                        />
                      </View>
                    </View>
                  </Card>
                </Animated.View>
              );
            })
          )}

          {decided.length > 0 ? (
            <View style={styles.decidedSection}>
              <Text variant="label" color="textSecondary" style={styles.decidedTitle}>
                RECENTLY DECIDED
              </Text>
              <Card padded={false}>
                {decided.map((a, i) => {
                  const approved = a.status === 'approved';
                  return (
                    <View key={a.id} style={[styles.decidedRow, i > 0 && styles.rowBorder]}>
                      <View style={styles.flex}>
                        <Text variant="bodyStrong">{a.docNumber}</Text>
                        <Text variant="caption" color="textSecondary" numberOfLines={1}>
                          {DOC_META[a.docType].label}
                          {a.vendorName && a.vendorName !== '—' ? ` · ${a.vendorName}` : ''}
                          {a.decidedAt ? ` · ${shortDate(a.decidedAt)}` : ''}
                        </Text>
                      </View>
                      <View style={styles.decision}>
                        <Ionicons
                          name={approved ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={approved ? theme.colors.success : theme.colors.danger}
                        />
                        <Text variant="caption" color={approved ? 'success' : 'danger'}>
                          {approved ? 'Approved' : 'Rejected'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    gap: 2,
  },
  body: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.huge,
    gap: theme.spacing.md,
  },
  flex: { flex: 1 },
  empty: { height: 360 },
  card: { gap: theme.spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  typeIcon: { width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  decidedSection: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  decidedTitle: { letterSpacing: 0.5, paddingHorizontal: theme.spacing.xs },
  decidedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  decision: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));
