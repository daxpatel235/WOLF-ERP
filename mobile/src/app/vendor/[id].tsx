import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAiStatus, useVendor, useVendorRisk } from '@/api/hooks';
import { AiButton, AiPanel, AiThinking, levelTone } from '@/components/ai/AiKit';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  NavHeader,
  Pill,
  PressableScale,
  Screen,
  Skeleton,
  StatusPill,
  Text,
} from '@/components/ui';
import { money, percent, shortDate } from '@/lib/format';
import type { Invoice, PurchaseOrder } from '@/types/domain';

type IconName = keyof typeof Ionicons.glyphMap;

export default function VendorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { data, isLoading } = useVendor(id);

  const vendor = data?.vendor;
  const pos = data?.purchaseOrders ?? [];
  const invoices = data?.invoices ?? [];
  const aiEnabled = useAiStatus().data?.enabled;
  const risk = useVendorRisk();

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title={vendor?.name ?? 'Vendor'} subtitle={vendor ? `${vendor.id} · ${vendor.category}` : undefined} />

      {isLoading || !vendor ? (
        <View style={styles.content}>
          <Skeleton height={140} radius={16} />
          <Skeleton height={80} radius={16} />
          <Skeleton height={200} radius={16} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Profile */}
            <Animated.View entering={FadeInDown.duration(260)}>
              <Card elevated style={styles.profile}>
                <View style={styles.profileHead}>
                  <Avatar name={vendor.name} color={vendor.logoColor} size={56} />
                  <View style={styles.flex}>
                    <StatusPill status={vendor.status} />
                    <View style={styles.rating}>
                      <Ionicons name="star" size={14} color={theme.colors.warning} />
                      <Text variant="bodyStrong">{vendor.rating.toFixed(1)}</Text>
                      <Text variant="caption" color="textSecondary">
                        · {percent(vendor.onTimeRate)} on-time
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.infoList}>
                  <Info icon="mail-outline" label="Email" value={vendor.email} />
                  <Info icon="call-outline" label="Phone" value={vendor.phone} />
                  <Info icon="location-outline" label="Location" value={vendor.city} />
                  <Info icon="document-text-outline" label="GSTIN" value={vendor.gstin || '—'} />
                </View>
              </Card>
            </Animated.View>

            {/* Stat tiles */}
            <View style={styles.tiles}>
              <Card style={styles.tile}>
                <Ionicons name="cart-outline" size={18} color={theme.colors.primary} />
                <Text variant="title">{vendor.orders}</Text>
                <Text variant="caption" color="textSecondary">
                  Total Orders
                </Text>
              </Card>
              <Card style={styles.tile}>
                <Ionicons name="cash-outline" size={18} color={theme.colors.primary} />
                <Text variant="title" numberOfLines={1}>
                  {money(vendor.totalSpend)}
                </Text>
                <Text variant="caption" color="textSecondary">
                  Total Spend
                </Text>
              </Card>
            </View>

            {/* AI risk assessment */}
            {aiEnabled ? (
              <View style={styles.aiBlock}>
                {risk.data ? (
                  <AiPanel title="AI risk assessment">
                    <View style={styles.riskHead}>
                      <Text variant="title">{risk.data.score}/100</Text>
                      <Pill tone={levelTone(risk.data.level)} label={`${risk.data.level} risk`} />
                    </View>
                    <Text variant="body" style={styles.aiText}>
                      {risk.data.rationale}
                    </Text>
                    {risk.data.signals?.length ? (
                      <View style={styles.aiList}>
                        <Text variant="label" color="textSecondary">
                          SIGNALS
                        </Text>
                        {risk.data.signals.map((s, i) => (
                          <Text key={i} variant="caption" color="textSecondary">
                            • {s}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {risk.data.recommendations?.length ? (
                      <View style={styles.aiList}>
                        <Text variant="label" color="textSecondary">
                          RECOMMENDATIONS
                        </Text>
                        {risk.data.recommendations.map((s, i) => (
                          <Text key={i} variant="caption" color="textSecondary">
                            • {s}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </AiPanel>
                ) : risk.isPending ? (
                  <AiPanel title="AI risk assessment">
                    <AiThinking label="Analysing vendor history…" />
                  </AiPanel>
                ) : (
                  <AiButton label="Assess risk" onPress={() => risk.mutate(vendor.id)} loading={risk.isPending} />
                )}
              </View>
            ) : null}

            {/* PO history */}
            <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
              PURCHASE ORDERS
            </Text>
            <Card padded={false}>
              {pos.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text variant="caption" color="textSecondary">
                    No purchase orders yet.
                  </Text>
                </View>
              ) : (
                pos.map((p: PurchaseOrder, i) => (
                  <HistoryRow
                    key={p.id}
                    border={i > 0}
                    title={p.number}
                    sub={shortDate(p.createdAt)}
                    amount={money(p.total)}
                    status={p.status}
                    onPress={() => router.push(`/po/${p.id}`)}
                  />
                ))
              )}
            </Card>

            {/* Invoice history */}
            <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
              INVOICES
            </Text>
            <Card padded={false}>
              {invoices.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text variant="caption" color="textSecondary">
                    No invoices yet.
                  </Text>
                </View>
              ) : (
                invoices.map((inv: Invoice, i) => (
                  <HistoryRow
                    key={inv.id}
                    border={i > 0}
                    title={inv.number}
                    sub={`Issued ${shortDate(inv.issuedAt)}`}
                    amount={money(inv.total)}
                    status={inv.status}
                    onPress={() => router.push(`/invoices/${inv.id}`)}
                  />
                ))
              )}
            </Card>

            {pos.length === 0 && invoices.length === 0 ? (
              <EmptyState icon="document-outline" title="No history yet" message="This vendor has no orders or invoices." />
            ) : null}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionBar}>
            <View style={styles.flex}>
              <Button
                label="Invite to RFQ"
                variant="secondary"
                icon={<Ionicons name="document-text-outline" size={18} color={theme.colors.text} />}
                onPress={() => router.push(`/rfqs/new?vendor=${vendor.id}`)}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label="Create PO"
                icon={<Ionicons name="cart-outline" size={18} color={theme.colors.textOnPrimary} />}
                onPress={() => router.push(`/po/new?vendor=${vendor.id}`)}
              />
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

function Info({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      <Text variant="caption" color="textSecondary" style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="body" numberOfLines={1} style={styles.flex}>
        {value}
      </Text>
    </View>
  );
}

function HistoryRow({
  border,
  title,
  sub,
  amount,
  status,
  onPress,
}: {
  border: boolean;
  title: string;
  sub: string;
  amount: string;
  status: PurchaseOrder['status'];
  onPress: () => void;
}) {
  return (
    <PressableScale haptic={false} scaleTo={0.99} onPress={onPress} style={[styles.historyRow, border && styles.rowBorder]}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {sub}
        </Text>
      </View>
      <View style={styles.historyRight}>
        <Text variant="bodyStrong">{amount}</Text>
        <StatusPill status={status} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: 120, gap: theme.spacing.md, paddingTop: theme.spacing.md },
  profile: { gap: theme.spacing.lg },
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  infoList: { gap: theme.spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  infoLabel: { width: 64 },
  tiles: { flexDirection: 'row', gap: theme.spacing.sm },
  tile: { flex: 1, gap: theme.spacing.xs, alignItems: 'flex-start' },
  sectionLabel: { marginTop: theme.spacing.sm, letterSpacing: 0.5 },
  aiBlock: { marginTop: theme.spacing.xs },
  riskHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiText: { marginTop: theme.spacing.xs },
  aiList: { gap: 2, marginTop: theme.spacing.sm },
  emptyRow: { padding: theme.spacing.lg },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
}));
