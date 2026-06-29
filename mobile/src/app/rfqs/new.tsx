import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAiStatus, useAllVendors, useCreateRfq, useDraftRfq } from '@/api/hooks';
import { AiButton } from '@/components/ai/AiKit';
import { Input } from '@/components/form/Input';
import { type EditableItem, LineItemsEditor } from '@/components/form/LineItemsEditor';
import { Select } from '@/components/form/Select';
import { Button, Card, NavHeader, PressableScale, Screen, Stepper, Text } from '@/components/ui';

const STEPS = ['Details', 'Line items', 'Vendors'];
const CATEGORIES = ['Office Furniture', 'Electronics', 'Raw Materials', 'IT Services', 'Logistics', 'Packaging', 'Tooling', 'Chemicals'];
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ label: c, value: c }));
const rfqItem = (): EditableItem => ({ description: '', quantity: '1', unitPrice: 'pcs' });

export default function NewRfqScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { vendor: vendorParam } = useLocalSearchParams<{ vendor?: string }>();
  const { data: vendorsPage } = useAllVendors();
  const create = useCreateRfq();

  const vendors = useMemo(() => vendorsPage?.items ?? [], [vendorsPage]);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [dueAt, setDueAt] = useState('');
  const [items, setItems] = useState<EditableItem[]>([rfqItem()]);
  const [selected, setSelected] = useState<string[]>(vendorParam ? [vendorParam] : []);
  const [error, setError] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const aiEnabled = useAiStatus().data?.enabled;
  const draft = useDraftRfq();

  const toggleVendor = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const draftWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setError('');
    try {
      const d = await draft.mutateAsync(aiPrompt.trim());
      if (d.title) setTitle(d.title);
      if (d.category && CATEGORIES.includes(d.category)) setCategory(d.category);
      if (d.suggestedDueInDays) {
        const dt = new Date();
        dt.setDate(dt.getDate() + d.suggestedDueInDays);
        setDueAt(dt.toISOString().slice(0, 10));
      }
      if (d.items?.length) {
        setItems(d.items.map((it) => ({ description: it.name, quantity: String(it.qty || 1), unitPrice: it.unit || 'pcs' })));
      }
    } catch {
      setError('AI could not draft this RFQ. Try rephrasing.');
    }
  };

  const next = async () => {
    setError('');
    if (step === 0) {
      if (!title.trim()) return setError('RFQ title is required');
      if (!dueAt.trim()) return setError('Pick a response deadline');
    }
    if (step === 1 && items.some((it) => !it.description.trim())) return setError('Every line item needs a name');
    if (step === 2 && selected.length === 0) return setError('Invite at least one vendor');

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    try {
      const rfq = await create.mutateAsync({
        title: title.trim(),
        category,
        dueAt: new Date(dueAt).toISOString(),
        items: items.map((it) => ({ name: it.description, quantity: Number(it.quantity) || 1, unit: it.unitPrice || 'pcs' })),
        invitedVendorIds: selected,
      });
      router.replace(`/rfqs/${rfq.id}`);
    } catch {
      setError('Could not create the RFQ.');
    }
  };

  const back = () => (step === 0 ? router.back() : setStep((s) => s - 1));

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Create RFQ" subtitle="Collect comparable quotes" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.stepperWrap}>
          <Stepper steps={STEPS} current={step} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 0 ? (
            <Card style={styles.card}>
              {aiEnabled ? (
                <View style={styles.aiBox}>
                  <Text variant="label" color="textSecondary">
                    DRAFT WITH AI
                  </Text>
                  <Input
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    placeholder="Describe what you need, e.g. 10 ergonomic office chairs"
                    multiline
                  />
                  <AiButton label="Draft with AI" onPress={draftWithAi} loading={draft.isPending} disabled={!aiPrompt.trim()} />
                </View>
              ) : null}
              <Input label="RFQ title" value={title} onChangeText={setTitle} placeholder="e.g. Office furniture — 3rd floor refit" />
              <Select label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
              <Input label="Response deadline" value={dueAt} onChangeText={setDueAt} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            </Card>
          ) : null}

          {step === 1 ? (
            <Card style={styles.card}>
              <Text variant="label" color="textSecondary">
                LINE ITEMS
              </Text>
              <LineItemsEditor items={items} onChange={setItems} unitMode />
            </Card>
          ) : null}

          {step === 2 ? (
            <Card style={styles.card}>
              <Text variant="label" color="textSecondary">
                INVITE VENDORS ({selected.length})
              </Text>
              <View style={styles.vendorGrid}>
                {vendors.map((v) => {
                  const on = selected.includes(v.id);
                  return (
                    <PressableScale
                      key={v.id}
                      haptic={false}
                      scaleTo={0.98}
                      onPress={() => toggleVendor(v.id)}
                      style={[styles.vendorChip, on && styles.vendorChipOn]}
                    >
                      <View style={[styles.check, on && styles.checkOn]}>
                        {on ? <Ionicons name="checkmark" size={13} color={theme.colors.textOnPrimary} /> : null}
                      </View>
                      <View style={styles.flex}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {v.name}
                        </Text>
                        <Text variant="caption" color="textSecondary" numberOfLines={1}>
                          {v.category}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </Card>
          ) : null}

          {error ? (
            <Text variant="caption" color="danger">
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.actionBar}>
          <View style={styles.flex}>
            <Button label={step === 0 ? 'Cancel' : 'Back'} variant="secondary" onPress={back} />
          </View>
          <View style={styles.flex}>
            <Button
              label={step === STEPS.length - 1 ? 'Publish RFQ' : 'Continue'}
              loading={create.isPending}
              onPress={next}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  stepperWrap: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.huge, gap: theme.spacing.lg },
  card: { gap: theme.spacing.lg },
  aiBox: { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  vendorGrid: { gap: theme.spacing.sm },
  vendorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  vendorChipOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  actionBar: {
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
