import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useSearch } from '@/api/hooks';
import { Avatar, EmptyState, PressableScale, Screen, Skeleton, StatusPill, Text } from '@/components/ui';
import { money } from '@/lib/format';
import { useDebounced } from '@/lib/useDebounced';

type IconName = keyof typeof Ionicons.glyphMap;

export default function SearchScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [text, setText] = useState('');
  const query = useDebounced(text);
  const { data, isFetching } = useSearch(query);

  const hasQuery = query.trim().length > 0;
  const total = useMemo(() => {
    if (!data) return 0;
    return data.vendors.length + data.purchaseOrders.length + data.rfqs.length + data.quotations.length + data.invoices.length;
  }, [data]);

  const go = (path: string) => {
    router.back();
    router.push(path as never);
  };

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      {/* Search bar */}
      <View style={styles.bar}>
        <View style={styles.inputRow}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Search vendors, POs, RFQs, invoices…"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
          />
          {text ? (
            <PressableScale haptic={false} onPress={() => setText('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
        <PressableScale haptic={false} onPress={() => router.back()}>
          <Text variant="body" color="primary">
            Cancel
          </Text>
        </PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!hasQuery ? (
          <EmptyState icon="search-outline" title="Search Wolf ERP" message="Find vendors, purchase orders, RFQs, quotations and invoices in one place." />
        ) : isFetching && !data ? (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={56} radius={12} />
            ))}
          </View>
        ) : total === 0 ? (
          <EmptyState icon="file-tray-outline" title="No matches" message={`Nothing found for “${query}”.`} />
        ) : (
          <>
            {data!.vendors.length > 0 && (
              <Section title="Vendors">
                {data!.vendors.map((v) => (
                  <Row
                    key={v.id}
                    leading={<Avatar name={v.name} color={v.logoColor} size={38} />}
                    title={v.name}
                    subtitle={`${v.category} · ${v.city}`}
                    onPress={() => go(`/vendor/${v.id}`)}
                  />
                ))}
              </Section>
            )}
            {data!.purchaseOrders.length > 0 && (
              <Section title="Purchase orders">
                {data!.purchaseOrders.map((p) => (
                  <Row
                    key={p.id}
                    icon="cart-outline"
                    title={p.number}
                    subtitle={p.vendorName}
                    trailing={<Text variant="bodyStrong">{money(p.total)}</Text>}
                    onPress={() => go(`/po/${p.id}`)}
                  />
                ))}
              </Section>
            )}
            {data!.rfqs.length > 0 && (
              <Section title="RFQs">
                {data!.rfqs.map((r) => (
                  <Row
                    key={r.id}
                    icon="document-text-outline"
                    title={r.title}
                    subtitle={`${r.number} · ${r.category}`}
                    trailing={<StatusPill status={r.status} />}
                    onPress={() => go(`/rfqs/${r.id}`)}
                  />
                ))}
              </Section>
            )}
            {data!.quotations.length > 0 && (
              <Section title="Quotations">
                {data!.quotations.map((q) => (
                  <Row
                    key={q.id}
                    icon="pricetag-outline"
                    title={q.vendorName}
                    subtitle={`${q.number} · ${q.rfqTitle}`}
                    trailing={<Text variant="bodyStrong">{money(q.total)}</Text>}
                    onPress={() => go(`/quotations/${q.id}`)}
                  />
                ))}
              </Section>
            )}
            {data!.invoices.length > 0 && (
              <Section title="Invoices">
                {data!.invoices.map((inv) => (
                  <Row
                    key={inv.id}
                    icon="receipt-outline"
                    title={inv.number}
                    subtitle={inv.vendorName}
                    trailing={<Text variant="bodyStrong">{money(inv.total)}</Text>}
                    onPress={() => go(`/invoices/${inv.id}`)}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  leading,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon?: IconName;
  leading?: React.ReactNode;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  return (
    <PressableScale haptic={false} scaleTo={0.99} onPress={onPress} style={styles.row}>
      {leading ?? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon ?? 'ellipse-outline'} size={18} color={theme.colors.textSecondary} />
        </View>
      )}
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {trailing}
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  input: { flex: 1, fontSize: 15, color: theme.colors.text, paddingVertical: 0 },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.huge, gap: theme.spacing.lg },
  skeletonWrap: { gap: theme.spacing.sm, paddingTop: theme.spacing.md },
  section: { gap: theme.spacing.sm },
  sectionLabel: { letterSpacing: 0.5, paddingHorizontal: theme.spacing.xs },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
