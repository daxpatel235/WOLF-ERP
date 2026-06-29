import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAwardQuotation, useQuotation, useSetQuotationStatus } from '@/api/hooks';
import {
  Avatar,
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

export default function QuotationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { data: quote, isLoading } = useQuotation(id);
  const award = useAwardQuotation();
  const setStatus = useSetQuotationStatus();

  const busy = award.isPending || setStatus.isPending;

  const onAward = () => {
    Alert.alert('Award quotation', 'This awards the quote, rejects competing quotes, and drafts a purchase order. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Award',
        onPress: async () => {
          try {
            const { po } = await award.mutateAsync(id);
            router.replace(`/po/${po.id}`);
          } catch {
            Alert.alert('Error', 'Could not award this quotation.');
          }
        },
      },
    ]);
  };

  const decided = quote && (quote.status === 'awarded' || quote.status === 'rejected');
  const canShortlist = quote && (quote.status === 'pending' || quote.status === 'sent');

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title={quote?.number ?? 'Quotation'} subtitle={quote ? `Against ${quote.rfqNumber}` : undefined} />

      {isLoading || !quote ? (
        <View style={styles.content}>
          <Skeleton height={84} radius={16} />
          <Skeleton height={220} radius={16} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Animated.View entering={FadeInDown.duration(260)}>
              <Card elevated style={styles.vendorCard}>
                <Avatar name={quote.vendorName} size={48} />
                <View style={styles.flex}>
                  <Text variant="heading" numberOfLines={1}>
                    {quote.vendorName}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    Submitted {shortDate(quote.submittedAt)}
                  </Text>
                </View>
                <StatusPill status={quote.status} />
              </Card>
            </Animated.View>

            <View style={styles.summaryRow}>
              <Tile label="Quoted total" value={money(quote.total)} />
              <Tile label="Delivery" value={`${quote.deliveryDays} days`} />
              <Tile label="Valid till" value={shortDate(quote.validUntil)} />
            </View>

            <Card style={styles.metaCard}>
              <PressableScale haptic={false} style={styles.metaRow} onPress={() => router.push(`/rfqs/${quote.rfqId}`)}>
                <Text variant="caption" color="textSecondary">
                  Linked RFQ
                </Text>
                <Text variant="bodyStrong" color="primary" numberOfLines={1} style={styles.rfqLink}>
                  {quote.rfqNumber} · {quote.rfqTitle}
                </Text>
              </PressableScale>
              <PressableScale haptic={false} style={styles.metaRow} onPress={() => router.push(`/vendor/${quote.vendorId}`)}>
                <Text variant="caption" color="textSecondary">
                  Vendor
                </Text>
                <Text variant="bodyStrong" color="primary">
                  {quote.vendorName}
                </Text>
              </PressableScale>
            </Card>

            <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
              QUOTED ITEMS
            </Text>
            <Card padded={false} style={styles.itemsCard}>
              {quote.items.map((it, idx) => (
                <View key={it.id} style={[styles.item, idx > 0 && styles.itemBorder]}>
                  <View style={styles.flex}>
                    <Text variant="body" numberOfLines={1}>
                      {it.description}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {it.quantity} {it.unit ?? ''} × {money(it.unitPrice)}
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
                  {money(quote.total)}
                </Text>
              </View>
            </Card>
          </ScrollView>

          <View style={styles.actionBar}>
            {decided ? (
              <Button label={quote.status === 'awarded' ? 'Awarded' : 'Rejected'} variant="secondary" disabled />
            ) : (
              <View style={styles.actionRow}>
                <PressableScale
                  haptic={false}
                  style={styles.rejectBtn}
                  onPress={() => setStatus.mutate({ id, status: 'rejected' })}
                  disabled={busy}
                >
                  <Ionicons name="close" size={20} color={theme.colors.danger} />
                </PressableScale>
                {canShortlist ? (
                  <View style={styles.flex}>
                    <Button label="Shortlist" variant="secondary" loading={setStatus.isPending} onPress={() => setStatus.mutate({ id, status: 'shortlisted' })} />
                  </View>
                ) : null}
                <View style={styles.flex}>
                  <Button
                    label="Award & create PO"
                    loading={award.isPending}
                    icon={<Ionicons name="trophy-outline" size={18} color={theme.colors.textOnPrimary} />}
                    onPress={onAward}
                  />
                </View>
              </View>
            )}
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
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: 120, gap: theme.spacing.md, paddingTop: theme.spacing.md },
  vendorCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm },
  tile: { flex: 1, gap: theme.spacing.xs },
  metaCard: { gap: theme.spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  rfqLink: { flexShrink: 1, textAlign: 'right' },
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
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  rejectBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
