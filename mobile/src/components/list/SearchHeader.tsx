import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

interface FilterOption<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  title: string;
  count?: number;
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  filters?: FilterOption<T>[];
  activeFilter?: T;
  onFilter?: (key: T) => void;
  /** Show a back chevron (for pushed list routes). */
  back?: boolean;
  /** Optional action on the right of the title (e.g. a "+" button). */
  right?: ReactNode;
}

/** Sticky-friendly header: title, search field, and horizontal filter chips. */
export function SearchHeader<T extends string>({
  title,
  count,
  search,
  onSearch,
  placeholder = 'Search…',
  filters,
  activeFilter,
  onFilter,
  back = false,
  right,
}: Props<T>) {
  const { theme } = useUnistyles();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        {back ? (
          <PressableScale onPress={() => router.back()} scaleTo={0.9} haptic={false} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
          </PressableScale>
        ) : null}
        <Text variant="title">{title}</Text>
        {count != null ? (
          <View style={styles.countBadge}>
            <Text variant="label" color="textSecondary">
              {count}
            </Text>
          </View>
        ) : null}
        <View style={styles.flex} />
        {right}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <PressableScale onPress={() => onSearch('')} haptic={false}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </PressableScale>
        ) : null}
      </View>

      {filters && filters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {filters.map((f) => {
            const active = f.key === activeFilter;
            return (
              <PressableScale
                key={f.key}
                scaleTo={0.94}
                onPress={() => onFilter?.(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text variant="caption" color={active ? 'textOnPrimary' : 'textSecondary'}>
                  {f.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1 },
  backBtn: { marginLeft: -8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  countBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceAlt,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  input: { flex: 1, fontSize: 15, color: theme.colors.text, paddingVertical: 0 },
  chips: { flexDirection: 'row', gap: theme.spacing.sm, paddingRight: theme.spacing.lg },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
}));
