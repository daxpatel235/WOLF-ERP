import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { usePurchaseOrder, useSetPoStatus } from '@/api/hooks';
import {
  Avatar,
  Button,
  Card,
  NavHeader,
  PressableScale,
  PriorityPill,
  Screen,
  Skeleton,
  StatusPill,
  Text,
} from '@/components/ui';
import { money, shortDate } from '@/lib/format';
import type { DocStatus } from '@/types/domain';

export default function PurchaseOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { data: po, isLoading } = usePurchaseOrder(id);
  const setStatus = useSetPoStatus(id);

  const advance = (next: DocStatus) => setStatus.mutate(next);

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader
        title={po?.number ?? 'Purchase Order'}
        subtitle={po ? `Issued to ${po.vendorName}` : undefined}
        right={
          <PressableScale haptic={false} style={styles.iconBtn} onPress={() => Alert.alert('Print', 'Generating PDF (demo).')}>
            <Ionicons name="print-outline" size={18} color={theme.colors.text} />
          </PressableScale>
        }
      />

      {isLoading || !po ? (
        <View style={styles.content}>
          <Skeleton height={84} radius={16} />
          <Skeleton height={220} radius={16} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Animated.View entering={FadeInDown.duration(260)}>
              <Card elevated style={styles.vendorCard}>
                <Avatar name={po.vendorName} size={48} />
                <View style={styles.flex}>
                  <Text variant="heading" numberOfLines={1}>
                    {po.vendorName}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    Ordered {shortDate(po.createdAt)}
                  </Text>
                </View>
                <View style={styles.pills}>
                  <StatusPill status={po.status} />
                  <PriorityPill priority={po.priority} />
                </View>
              </Card>
            </Animated.View>

            <View style={styles.summaryRow}>
              <Tile label="Total value" value={money(po.total)} />
              <Tile label="Expected" value={shortDate(po.expectedAt)} />
              <Tile label="Items" value={String(po.items.length)} />
            </View>

            <Card style={styles.metaCard}>
              <PressableScale haptic={false} style={styles.metaRow} onPress={() => router.push(`/vendor/${po.vendorId}`)}>
                <Text variant="caption" color="textSecondary">
                  Vendor
                </Text>
                <Text variant="bodyStrong" color="primary">
                  {po.vendorName}
                </Text>
              </PressableScale>
            </Card>

            <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
              LINE ITEMS
            </Text>
            <Card padded={false} style={styles.itemsCard}>
              {po.items.map((it, idx) => (
                <View key={it.id} style={[styles.item, idx > 0 && styles.itemBorder]}>
                  <View style={styles.flex}>
                    <Text variant="body" numberOfLines={1}>
                      {it.description}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {it.quantity} × {money(it.unitPrice)}
                    </Text>
                  </View>
                  <Text variant="bodyStrong">
                    {money({ amount: it.quantity * it.unitPrice.amount, currency: it.unitPrice.currency })}
                  </Text>
                </View>
              ))}
              <View style={[styles.item, styles.itemBorder, styles.totalRow]}>
                <Text variant="bodyStrong">Total</Text>
                <Text variant="heading" color="primary">
                  {money(po.total)}
                </Text>
              </View>
            </Card>

            {po.notes ? (
              <>
                <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
                  NOTES
                </Text>
                <Card>
                  <Text variant="body" color="textSecondary">
                    {po.notes}
                  </Text>
                </Card>
              </>
            ) : null}
          </ScrollView>

          {/* Contextual lifecycle actions */}
          <View style={styles.actionBar}>
            {po.status === 'draft' && (
              <Button label="Submit for approval" loading={setStatus.isPending} onPress={() => advance('pending_approval')} />
            )}
            {po.status === 'pending_approval' && (
              <Button label="Awaiting approval" variant="secondary" disabled />
            )}
            {po.status === 'approved' && (
              <Button label="Send to vendor" loading={setStatus.isPending} icon={<Ionicons name="paper-plane-outline" size={18} color={theme.colors.textOnPrimary} />} onPress={() => advance('sent')} />
            )}
            {po.status === 'sent' && (
              <View style={styles.actionRow}>
                <View style={styles.flex}>
                  <Button label="Create invoice" variant="secondary" onPress={() => router.push(`/invoices/new?po=${po.id}`)} />
                </View>
                <View style={styles.flex}>
                  <Button label="Mark received" loading={setStatus.isPending} onPress={() => advance('received')} />
                </View>
              </View>
            )}
            {po.status === 'received' && (
              <Button label="Create invoice" onPress={() => router.push(`/invoices/new?po=${po.id}`)} icon={<Ionicons name="receipt-outline" size={18} color={theme.colors.textOnPrimary} />} />
            )}
            {po.status === 'cancelled' && <Button label="Cancelled" variant="secondary" disabled />}
          </View>
        </>
      )}
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.tile}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" numberOfLines={1}>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: 120, gap: theme.spacing.md, paddingTop: theme.spacing.md },
  vendorCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  pills: { alignItems: 'flex-end', gap: 4 },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm },
  tile: { flex: 1, gap: theme.spacing.xs },
  metaCard: {},
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { marginTop: theme.spacing.sm, letterSpacing: 0.5 },
  itemsCard: { overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, padding: theme.spacing.lg },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  totalRow: { backgroundColor: theme.colors.surfaceAlt },
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
  actionRow: { flexDirection: 'row', gap: theme.spacing.md },
}));
