import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import { TextInput, type TextInputProps, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PressableScale, Text } from '@/components/ui';

interface Props<T extends FieldValues> extends Omit<TextInputProps, 'secureTextEntry'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  /** Renders a show/hide toggle and masks input until revealed. */
  secure?: boolean;
}

/** Labeled, icon-prefixed input bound to react-hook-form — shared across the auth flow. */
export function AuthField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  icon,
  error,
  secure,
  ...input
}: Props<T>) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  styles.useVariants({ focused, invalid: !!error });
  return (
    <View style={styles.fieldWrap}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <View style={styles.inputRow}>
            <Ionicons name={icon} size={18} style={styles.inputIcon} />
            <TextInput
              {...input}
              value={value}
              onChangeText={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              placeholder={placeholder}
              placeholderTextColor={styles.placeholder.color}
              secureTextEntry={secure && !reveal}
              style={styles.input}
            />
            {secure ? (
              <PressableScale haptic={false} onPress={() => setReveal((r) => !r)} style={styles.toggle}>
                <Ionicons name={reveal ? 'eye-off-outline' : 'eye-outline'} size={18} style={styles.inputIcon} />
              </PressableScale>
            ) : null}
          </View>
        )}
      />
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  fieldWrap: { gap: theme.spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: 52,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    variants: {
      focused: {
        true: { borderColor: theme.colors.primary },
        false: { borderColor: theme.colors.border },
      },
      invalid: {
        true: { borderColor: theme.colors.danger },
        false: {},
      },
    },
  },
  inputIcon: { color: theme.colors.textSecondary },
  input: { flex: 1, fontSize: 15, color: theme.colors.text, paddingVertical: 0 },
  placeholder: { color: theme.colors.textSecondary },
  toggle: { padding: 4 },
}));
