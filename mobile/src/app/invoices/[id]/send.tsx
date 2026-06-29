import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useInvoice, useVendor } from '@/api/hooks';
import { Button, Card, EmptyState, NavHeader, Screen, Skeleton, Text } from '@/components/ui';
import { money, shortDate } from '@/lib/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InvoiceSend() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { data: inv, isLoading } = useInvoice(id);
  const { data: vendorData } = useVendor(inv?.vendorId ?? '');
  const vendor = vendorData?.vendor;

  // Edits override the data-derived defaults; null means "still showing the prefill".
  const [toEdit, setToEdit] = useState<string | null>(null);
  const [subjectEdit, setSubjectEdit] = useState<string | null>(null);
  const [messageEdit, setMessageEdit] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const to = toEdit ?? vendor?.email ?? '';
  const subject = subjectEdit ?? (inv ? `Invoice ${inv.number} from Wolf ERP` : '');
  const message =
    messageEdit ??
    (inv
      ? `Hi ${vendor?.contact || 'there'},\n\nPlease find attached invoice ${inv.number} for ${money(inv.total)}, due ${shortDate(inv.dueAt)}.\n\nThanks,\nWolf ERP Accounts`
      : '');

  const submit = async () => {
    setError('');
    if (!EMAIL_RE.test(to)) return setError('Enter a valid recipient email');
    // Demo send: hand off to the device mail client if available, then confirm.
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    try {
      if (await Linking.canOpenURL(mailto)) await Linking.openURL(mailto);
    } catch {
      // Non-fatal — still show the confirmation for the demo.
    }
    setSent(true);
  };

  if (isLoading) {
    return (
      <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
        <NavHeader title="Send invoice" />
        <View style={styles.content}>
          <Skeleton height={280} radius={16} />
        </View>
      </Screen>
    );
  }

  if (!inv) {
    return (
      <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
        <NavHeader title="Send invoice" />
        <View style={styles.content}>
          <Card>
            <EmptyState title="Invoice not found" message={`No invoice with id ${id}`} />
          </Card>
        </View>
      </Screen>
    );
  }

  if (sent) {
    return (
      <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
        <NavHeader title="Send invoice" subtitle={inv.number} />
        <View style={styles.successWrap}>
          <Card elevated style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={40} color={theme.colors.success} />
            </View>
            <Text variant="heading">Invoice sent</Text>
            <Text variant="body" color="textSecondary" style={styles.center}>
              {inv.number} was emailed to {to}.
            </Text>
            <View style={styles.successActions}>
              <View style={styles.flex}>
                <Button label="Back to invoice" variant="secondary" onPress={() => router.replace(`/invoices/${inv.id}`)} />
              </View>
              <View style={styles.flex}>
                <Button label="Done" onPress={() => router.replace('/invoices')} />
              </View>
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Send invoice" subtitle={`Email ${inv.number} to the vendor`} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            <Field label="To" value={to} onChangeText={setToEdit} placeholder="vendor@company.com" keyboardType="email-address" />
            <Field label="Subject" value={subject} onChangeText={setSubjectEdit} />
            <Field label="Message" value={message} onChangeText={setMessageEdit} multiline />

            <View style={styles.attach}>
              <Ionicons name="document-attach-outline" size={16} color={theme.colors.textSecondary} />
              <Text variant="caption" color="textSecondary">
                {inv.number}.pdf attached ({money(inv.total)})
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
              <Button label="Send invoice" icon={<Ionicons name="paper-plane-outline" size={18} color={theme.colors.textOnPrimary} />} onPress={submit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  multiline,
  ...rest
}: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.fieldWrap}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <TextInput
        {...rest}
        multiline={multiline}
        autoCapitalize="none"
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  card: { gap: theme.spacing.lg },
  fieldWrap: { gap: theme.spacing.xs },
  input: {
    minHeight: 46,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    fontSize: 15,
    color: theme.colors.text,
  },
  inputMultiline: { minHeight: 140, textAlignVertical: 'top' },
  attach: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, padding: theme.spacing.md },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  successWrap: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
  successCard: { alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.xl },
  successIcon: { marginBottom: theme.spacing.xs },
  center: { textAlign: 'center' },
  successActions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md, alignSelf: 'stretch' },
}));
