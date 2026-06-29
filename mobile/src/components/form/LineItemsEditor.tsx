import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

export interface EditableItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

export const emptyItem = (): EditableItem => ({ description: '', quantity: '1', unitPrice: '' });

interface Props {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  /** show a unit column instead of price (RFQ line items) */
  unitMode?: boolean;
}

export function LineItemsEditor({ items, onChange, unitMode = false }: Props) {
  const { theme } = useUnistyles();
  const set = (i: number, k: keyof EditableItem, v: string) =>
    onChange(items.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const add = () => onChange([...items, unitMode ? { description: '', quantity: '1', unitPrice: 'pcs' } : emptyItem()]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <View style={styles.wrap}>
      {items.map((it, i) => (
        <View key={i} style={styles.row}>
          <TextInput
            value={it.description}
            onChangeText={(v) => set(i, 'description', v)}
            placeholder="Item description"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, styles.flex]}
          />
          <TextInput
            value={it.quantity}
            onChangeText={(v) => set(i, 'quantity', v)}
            keyboardType="number-pad"
            placeholder="Qty"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, styles.qty]}
          />
          <TextInput
            value={it.unitPrice}
            onChangeText={(v) => set(i, 'unitPrice', v)}
            keyboardType={unitMode ? 'default' : 'number-pad'}
            placeholder={unitMode ? 'Unit' : 'Price'}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, styles.price]}
          />
          <PressableScale
            haptic={false}
            scaleTo={0.9}
            disabled={items.length === 1}
            style={styles.remove}
            onPress={() => remove(i)}
          >
            <Ionicons name="trash-outline" size={18} color={items.length === 1 ? theme.colors.textMuted : theme.colors.danger} />
          </PressableScale>
        </View>
      ))}
      <PressableScale haptic={false} style={styles.add} onPress={add}>
        <Ionicons name="add" size={16} color={theme.colors.primary} />
        <Text variant="label" color="primary">
          Add item
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  flex: { flex: 1 },
  qty: { width: 56 },
  price: { width: 84 },
  input: {
    height: 44,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    fontSize: 14,
    color: theme.colors.text,
  },
  remove: { padding: theme.spacing.xs },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: theme.spacing.xs },
}));
