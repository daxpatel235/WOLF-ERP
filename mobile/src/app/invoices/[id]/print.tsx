import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useInvoice } from '@/api/hooks';
import { COMPANY } from '@/api/mock/fixtures';
import { Button, Card, EmptyState, NavHeader, Screen, Skeleton, Text } from '@/components/ui';
import { money, shortDate } from '@/lib/format';

export default function InvoicePrint() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useUnistyles();
  const { data: inv, isLoading } = useInvoice(id);

  const share = async () => {
    if (!inv) return;
    const lines = inv.items
      .map((it) => `  • ${it.description} — ${it.quantity} × ${money(it.unitPrice)} = ${money({ amount: it.quantity * it.unitPrice.amount, currency: it.unitPrice.currency })}`)
      .join('\n');
    const body = [
      `TAX INVOICE ${inv.number}`,
      '',
      `From: ${COMPANY.name}`,
      `${COMPANY.address}`,
      `GSTIN: ${COMPANY.gstin}`,
      '',
      `Bill to: ${inv.vendorName}`,
      inv.poNumber ? `Ref PO: ${inv.poNumber}` : null,
      `Issued: ${shortDate(inv.issuedAt)}   Due: ${shortDate(inv.dueAt)}`,
      '',
      'Items:',
      lines,
      '',
      `Subtotal: ${money(inv.subtotal)}`,
      `GST (18%): ${money(inv.gst)}`,
      `Total: ${money(inv.total)}`,
    ]
      .filter(Boolean)
      .join('\n');
    await Share.share({ title: `${inv.number}.pdf`, message: body });
  };

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Print invoice" subtitle={inv?.number} />

      {isLoading ? (
        <View style={styles.content}>
          <Skeleton height={320} radius={16} />
        </View>
      ) : !inv ? (
        <View style={styles.content}>
          <Card>
            <EmptyState title="Invoice not found" message={`No invoice with id ${id}`} />
          </Card>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Card elevated style={styles.doc}>
              {/* Header */}
              <View style={styles.docHead}>
                <View style={styles.brand}>
                  <View style={styles.logo}>
                    <Text variant="heading" style={styles.logoText}>
                      W
                    </Text>
                  </View>
                  <View>
                    <Text variant="bodyStrong">Wolf</Text>
                    <Text variant="caption" color="textSecondary">
                      {COMPANY.name}
                    </Text>
                  </View>
                </View>
                <View style={styles.right}>
                  <Text variant="title" color="primary">
                    TAX INVOICE
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {inv.number}
                  </Text>
                </View>
              </View>

              {/* From / Bill-to */}
              <View style={styles.parties}>
                <View style={styles.flex}>
                  <Text variant="label" color="textSecondary">
                    FROM
                  </Text>
                  <Text variant="bodyStrong">{COMPANY.name}</Text>
                  <Text variant="caption" color="textSecondary">
                    {COMPANY.address}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    GSTIN: {COMPANY.gstin}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {COMPANY.email}
                  </Text>
                </View>
                <View style={[styles.flex, styles.alignEnd]}>
                  <Text variant="label" color="textSecondary">
                    BILL TO
                  </Text>
                  <Text variant="bodyStrong">{inv.vendorName}</Text>
                  {inv.poNumber ? (
                    <Text variant="caption" color="textSecondary">
                      Ref PO: {inv.poNumber}
                    </Text>
                  ) : null}
                  <Text variant="caption" color="textSecondary">
                    Issued: {shortDate(inv.issuedAt)}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    Due: {shortDate(inv.dueAt)}
                  </Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.tableHead}>
                <Text variant="label" color="textSecondary" style={styles.flex}>
                  DESCRIPTION
                </Text>
                <Text variant="label" color="textSecondary" style={styles.colQty}>
                  QTY
                </Text>
                <Text variant="label" color="textSecondary" style={styles.colAmt}>
                  AMOUNT
                </Text>
              </View>
              {inv.items.map((it, idx) => (
                <View key={it.id} style={[styles.tableRow, idx > 0 && styles.rowBorder]}>
                  <View style={styles.flex}>
                    <Text variant="body">{it.description}</Text>
                    <Text variant="caption" color="textSecondary">
                      {money(it.unitPrice)} each
                    </Text>
                  </View>
                  <Text variant="body" style={styles.colQty}>
                    {it.quantity}
                  </Text>
                  <Text variant="bodyStrong" style={styles.colAmt}>
                    {money({ amount: it.quantity * it.unitPrice.amount, currency: it.unitPrice.currency })}
                  </Text>
                </View>
              ))}

              {/* Totals */}
              <View style={styles.totals}>
                <Row label="Subtotal" value={money(inv.subtotal)} />
                <Row label="GST (18%)" value={money(inv.gst)} />
                <View style={styles.totalDivider} />
                <View style={styles.totalRow}>
                  <Text variant="bodyStrong">Total</Text>
                  <Text variant="heading" color="primary">
                    {money(inv.total)}
                  </Text>
                </View>
              </View>

              <Text variant="caption" color="textMuted" style={styles.footer}>
                This is a computer-generated invoice and does not require a signature. · {COMPANY.phone}
              </Text>
            </Card>
          </ScrollView>

          <View style={styles.actionBar}>
            <Button
              label="Share / Export PDF"
              icon={<Ionicons name="share-outline" size={18} color={theme.colors.textOnPrimary} />}
              onPress={share}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: 120, gap: theme.spacing.md },
  doc: { gap: theme.spacing.lg },
  docHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  logo: { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: theme.colors.textOnPrimary },
  right: { alignItems: 'flex-end' },
  parties: { flexDirection: 'row', gap: theme.spacing.lg },
  alignEnd: { alignItems: 'flex-end' },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: theme.spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.borderStrong },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  colQty: { width: 48, textAlign: 'right' },
  colAmt: { width: 96, textAlign: 'right' },
  totals: { gap: theme.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderStrong, paddingTop: theme.spacing.md },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.borderStrong, marginVertical: 2 },
  footer: { textAlign: 'center', marginTop: theme.spacing.md },
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
