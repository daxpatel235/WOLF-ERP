import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAiStatus, useAllVendors, useCreateInvoice, useExtractDocument } from '@/api/hooks';
import { AiButton, AiPanel, AiThinking } from '@/components/ai/AiKit';
import { Input } from '@/components/form/Input';
import { emptyItem, type EditableItem, LineItemsEditor } from '@/components/form/LineItemsEditor';
import { Select } from '@/components/form/Select';
import { Button, Card, NavHeader, PressableScale, Screen, Text } from '@/components/ui';
import { money } from '@/lib/format';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { po } = useLocalSearchParams<{ po?: string }>();
  const { data: vendorsPage } = useAllVendors();
  const create = useCreateInvoice();
  const aiEnabled = useAiStatus().data?.enabled;
  const extract = useExtractDocument();

  const vendorOptions = useMemo(
    () => (vendorsPage?.items ?? []).map((v) => ({ label: v.name, value: v.id, hint: v.category })),
    [vendorsPage],
  );

  const [vendorId, setVendorId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [items, setItems] = useState<EditableItem[]>([emptyItem()]);
  const [error, setError] = useState('');

  // --- AI document extraction (paste invoice text → fills vendor + items) ---
  const [showExtract, setShowExtract] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const runExtract = async () => {
    if (!pasteText.trim()) return setError('Paste the invoice text first');
    setError('');
    try {
      const data = await extract.mutateAsync({ kind: 'invoice', text: pasteText });
      if (data.vendor) {
        const needle = data.vendor.toLowerCase();
        const match = (vendorsPage?.items ?? []).find(
          (v) => v.name.toLowerCase().includes(needle) || needle.includes(v.name.toLowerCase()),
        );
        if (match) setVendorId(match.id);
      }
      if (data.items?.length) {
        setItems(
          data.items.map((it) => ({
            description: it.name || '',
            quantity: String(Number(it.qty) || 1),
            unitPrice: String(Number(it.unitPrice) || 0),
          })),
        );
      }
      setShowExtract(false);
      setPasteText('');
    } catch {
      setError('Could not extract the document.');
    }
  };

  const effectiveVendor = vendorId || vendorOptions[0]?.value || '';
  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  const submit = async () => {
    setError('');
    if (!effectiveVendor) return setError('Select a vendor');
    if (!dueAt.trim()) return setError('Enter a due date');
    if (items.some((it) => !it.description.trim() || Number(it.unitPrice) <= 0))
      return setError('Each item needs a description and price');
    try {
      const inv = await create.mutateAsync({
        vendorId: effectiveVendor,
        poId: po,
        dueAt: new Date(dueAt).toISOString(),
        items: items.map((it, i) => ({
          id: `new-${i}`,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: { amount: Number(it.unitPrice) || 0, currency: 'INR' as const },
        })),
      });
      router.replace(`/invoices/${inv.id}`);
    } catch {
      setError('Could not create invoice.');
    }
  };

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Create invoice" subtitle={po ? `Billing for ${po}` : 'Auto GST calculation'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {aiEnabled && !showExtract ? (
            <AiButton label="Extract from document" onPress={() => setShowExtract(true)} />
          ) : null}

          {aiEnabled && showExtract ? (
            <AiPanel title="Extract invoice with AI">
              <Text variant="caption" color="textSecondary">
                Paste the vendor&apos;s invoice text — AI fills the vendor and line items for you to review.
              </Text>
              <TextInput
                value={pasteText}
                onChangeText={setPasteText}
                multiline
                placeholder="Paste invoice text here…"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.paste}
              />
              <View style={styles.extractActions}>
                <PressableScale haptic={false} onPress={() => setShowExtract(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                </PressableScale>
                <View style={styles.flex} />
                {extract.isPending ? (
                  <AiThinking label="Reading the document…" />
                ) : (
                  <AiButton label="Extract" onPress={runExtract} />
                )}
              </View>
            </AiPanel>
          ) : null}

          <Card style={styles.card}>
            <Select label="Vendor" value={effectiveVendor} options={vendorOptions} onChange={setVendorId} placeholder="Select vendor" />
            <Input label="Due date" value={dueAt} onChangeText={setDueAt} placeholder="YYYY-MM-DD" autoCapitalize="none" />

            <View style={styles.itemsHead}>
              <Text variant="label" color="textSecondary">
                LINE ITEMS
              </Text>
            </View>
            <LineItemsEditor items={items} onChange={setItems} />

            <View style={styles.totals}>
              <Row label="Subtotal" value={money({ amount: subtotal, currency: 'INR' })} />
              <Row label="GST (18%)" value={money({ amount: gst, currency: 'INR' })} />
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text variant="bodyStrong">Total</Text>
                <Text variant="heading" color="primary">
                  {money({ amount: total, currency: 'INR' })}
                </Text>
              </View>
            </View>

            {error ? (
              <Text variant="caption" color="danger">
                {error}
              </Text>
            ) : null}
          </Card>

          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
            </View>
            <View style={styles.flex}>
              <Button label="Create invoice" loading={create.isPending} onPress={submit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="body" color="textSecondary">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  card: { gap: theme.spacing.lg },
  paste: {
    minHeight: 96,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.text,
    textAlignVertical: 'top',
    marginTop: theme.spacing.xs,
  },
  extractActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  closeBtn: { width: 36, height: 36, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center' },
  itemsHead: { marginBottom: -theme.spacing.sm },
  totals: { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.borderStrong },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
}));
