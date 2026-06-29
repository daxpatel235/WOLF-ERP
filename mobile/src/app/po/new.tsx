import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useAllVendors, useCreatePurchaseOrder } from '@/api/hooks';
import { Input } from '@/components/form/Input';
import { emptyItem, type EditableItem, LineItemsEditor } from '@/components/form/LineItemsEditor';
import { Select } from '@/components/form/Select';
import { Button, Card, NavHeader, Screen, Text } from '@/components/ui';
import { money } from '@/lib/format';
import type { Priority } from '@/types/domain';

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export default function NewPurchaseOrderScreen() {
  const router = useRouter();
  const { vendor } = useLocalSearchParams<{ vendor?: string }>();
  const { data: vendorsPage } = useAllVendors();
  const create = useCreatePurchaseOrder();

  const vendorOptions = useMemo(
    () => (vendorsPage?.items ?? []).map((v) => ({ label: v.name, value: v.id, hint: v.category })),
    [vendorsPage],
  );

  const [vendorId, setVendorId] = useState(vendor ?? '');
  const [priority, setPriority] = useState<Priority>('medium');
  const [expectedAt, setExpectedAt] = useState('');
  const [items, setItems] = useState<EditableItem[]>([emptyItem()]);
  const [error, setError] = useState('');

  const effectiveVendor = vendorId || vendorOptions[0]?.value || '';
  const total = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);

  const submit = async () => {
    setError('');
    if (!effectiveVendor) return setError('Select a vendor');
    if (!expectedAt.trim()) return setError('Enter a delivery date');
    if (items.some((it) => !it.description.trim() || Number(it.unitPrice) <= 0))
      return setError('Each item needs a description and price');
    try {
      const po = await create.mutateAsync({
        vendorId: effectiveVendor,
        priority,
        expectedAt: new Date(expectedAt).toISOString(),
        items: items.map((it, i) => ({
          id: `new-${i}`,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: { amount: Number(it.unitPrice) || 0, currency: 'INR' as const },
        })),
      });
      router.replace(`/po/${po.id}`);
    } catch {
      setError('Could not create purchase order.');
    }
  };

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="New purchase order" subtitle="Raise a PO against a vendor" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            <Select label="Vendor" value={effectiveVendor} options={vendorOptions} onChange={setVendorId} placeholder="Select vendor" />
            <View style={styles.rowFields}>
              <View style={styles.flex}>
                <Select label="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={(v) => setPriority(v as Priority)} />
              </View>
              <View style={styles.flex}>
                <Input label="Delivery date" value={expectedAt} onChangeText={setExpectedAt} placeholder="YYYY-MM-DD" autoCapitalize="none" />
              </View>
            </View>

            <Text variant="label" color="textSecondary">
              LINE ITEMS
            </Text>
            <LineItemsEditor items={items} onChange={setItems} />

            <View style={styles.totalBar}>
              <Text variant="body" color="textSecondary">
                Order total
              </Text>
              <Text variant="heading" color="primary">
                {money({ amount: total, currency: 'INR' })}
              </Text>
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
              <Button label="Create PO" loading={create.isPending} onPress={submit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  card: { gap: theme.spacing.lg },
  rowFields: { flexDirection: 'row', gap: theme.spacing.md },
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
}));
