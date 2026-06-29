import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAiStatus, useInvoice, useInvoiceAudit, usePayInvoice } from '@/api/hooks';
import { AiButton, AiPanel, AiThinking, levelTone } from '@/components/ai/AiKit';
import {
  Avatar,
  Button,
  Card,
  NavHeader,
  Pill,
  PressableScale,
  Screen,
  Skeleton,
  StatusPill,
  Text,
} from '@/components/ui';
import { money, shortDate } from '@/lib/format';

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { data: inv, isLoading } = useInvoice(id);
  const pay = usePayInvoice(id);
  const aiEnabled = useAiStatus().data?.enabled;
  const audit = useInvoiceAudit();

  const canPay = inv && inv.status !== 'paid' && inv.status !== 'cancelled';

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader
        title={inv?.number ?? 'Invoice'}
        subtitle={inv ? `Billed to ${inv.vendorName}` : undefined}
        right={
          <PressableScale haptic={false} style={styles.iconBtn} onPress={() => router.push(`/invoices/${id}/send`)}>
            <Ionicons name="paper-plane-outline" size={18} color={theme.colors.text} />
          </PressableScale>
        }
      />

      {isLoading || !inv ? (
        <View style={styles.content}>
          <Skeleton height={84} radius={16} />
          <Skeleton height={220} radius={16} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Animated.View entering={FadeInDown.duration(260)}>
              <Card elevated style={styles.vendorCard}>
                <Avatar name={inv.vendorName} size={48} />
                <View style={styles.flex}>
                  <Text variant="heading" numberOfLines={1}>
                    {inv.vendorName}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    Issued {shortDate(inv.issuedAt)} · due {shortDate(inv.dueAt)}
                  </Text>
                </View>
                <StatusPill status={inv.status} />
              </Card>
            </Animated.View>

            {/* Meta links */}
            <Card style={styles.metaCard}>
              <MetaRow label="Vendor" value={inv.vendorName} onPress={() => router.push(`/vendor/${inv.vendorId}`)} />
              {inv.poId ? (
                <MetaRow label="Linked PO" value={inv.poNumber ?? '—'} onPress={() => router.push(`/po/${inv.poId}`)} border />
              ) : null}
              <MetaRow label="Amount paid" value={money(inv.amountPaid)} border />
            </Card>

            {/* Items */}
            <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
              ITEMS
            </Text>
            <Card padded={false} style={styles.itemsCard}>
              {inv.items.map((it, idx) => (
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
              <View style={styles.totals}>
                <TotalRow label="Subtotal" value={money(inv.subtotal)} />
                <TotalRow label="GST (18%)" value={money(inv.gst)} />
                <View style={styles.totalDivider} />
                <View style={styles.totalRow}>
                  <Text variant="bodyStrong">Total</Text>
                  <Text variant="heading" color="primary">
                    {money(inv.total)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* AI invoice audit */}
            {aiEnabled ? (
              <View style={styles.aiBlock}>
                {audit.data ? (
                  <AiPanel title="AI invoice audit">
                    <View style={styles.auditHead}>
                      <Pill tone={levelTone(audit.data.verdict)} label={String(audit.data.verdict).toUpperCase()} />
                      {audit.data.confidence != null ? (
                        <Text variant="caption" color="textSecondary">
                          {Math.round(audit.data.confidence * 100)}% confidence
                        </Text>
                      ) : null}
                    </View>
                    {audit.data.duplicateSuspect ? (
                      <Text variant="caption" color="danger" style={styles.aiText}>
                        ⚠ Possible duplicate payment
                      </Text>
                    ) : null}
                    <Text variant="body" style={styles.aiText}>
                      {audit.data.summary}
                    </Text>
                    {audit.data.findings?.length ? (
                      <View style={styles.aiList}>
                        <Text variant="label" color="textSecondary">
                          FINDINGS
                        </Text>
                        {audit.data.findings.map((f, i) => (
                          <Text key={i} variant="caption" color="textSecondary">
                            • {typeof f === 'string' ? f : [f.label, f.detail].filter(Boolean).join(': ')}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </AiPanel>
                ) : audit.isPending ? (
                  <AiPanel title="AI invoice audit">
                    <AiThinking label="Matching against the purchase order…" />
                  </AiPanel>
                ) : (
                  <AiButton label="Audit invoice" onPress={() => audit.mutate(inv.id)} loading={audit.isPending} />
                )}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actionBar}>
            <View style={styles.flex}>
              <Button label="Print" variant="secondary" icon={<Ionicons name="print-outline" size={18} color={theme.colors.text} />} onPress={() => router.push(`/invoices/${id}/print`)} />
            </View>
            {canPay ? (
              <View style={styles.flex}>
                <Button label="Mark paid" loading={pay.isPending} onPress={() => pay.mutate()} />
              </View>
            ) : (
              <View style={styles.flex}>
                <Button label="Paid" variant="secondary" disabled />
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function MetaRow({ label, value, onPress, border }: { label: string; value: string; onPress?: () => void; border?: boolean }) {
  return (
    <PressableScale haptic={false} disabled={!onPress} onPress={onPress} style={[styles.metaRow, border && styles.metaBorder]}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" color={onPress ? 'primary' : 'text'}>
        {value}
      </Text>
    </PressableScale>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalRow}>
      <Text variant="body" color="textSecondary">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: 120, gap: theme.spacing.md, paddingTop: theme.spacing.md },
  vendorCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  metaCard: { gap: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm },
  metaBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  sectionLabel: { marginTop: theme.spacing.sm, letterSpacing: 0.5 },
  aiBlock: { marginTop: theme.spacing.xs },
  auditHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  aiText: { marginTop: theme.spacing.xs },
  aiList: { gap: 2, marginTop: theme.spacing.sm },
  itemsCard: { overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, padding: theme.spacing.lg },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  totals: { padding: theme.spacing.lg, gap: theme.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.borderStrong, marginVertical: 2 },
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
