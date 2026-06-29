import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

export interface Option {
  label: string;
  value: string;
  hint?: string;
}

interface Props {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Tap-to-open modal picker (works without extra native deps). */
export function Select({ label, value, options, onChange, placeholder = 'Select…' }: Props) {
  const { theme } = useUnistyles();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <PressableScale haptic={false} scaleTo={0.99} style={styles.field} onPress={() => setOpen(true)}>
        <Text variant="body" color={selected ? 'text' : 'textMuted'} numberOfLines={1} style={styles.flex}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            {label ? (
              <Text variant="heading" style={styles.sheetTitle}>
                {label}
              </Text>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              style={styles.list}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <PressableScale
                    haptic={false}
                    scaleTo={0.99}
                    style={styles.option}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <View style={styles.flex}>
                      <Text variant="body" color={active ? 'primary' : 'text'}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text variant="caption" color="textSecondary">
                          {item.hint}
                        </Text>
                      ) : null}
                    </View>
                    {active ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                  </PressableScale>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: { gap: theme.spacing.xs },
  flex: { flex: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  backdrop: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    maxHeight: '70%',
  },
  sheetTitle: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  list: { paddingHorizontal: theme.spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
}));
