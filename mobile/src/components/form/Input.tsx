import { useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Text } from '@/components/ui/Text';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

/** Labeled text input matching the web form fields (focus ring, error state). */
export function Input({ label, error, style, onFocus, onBlur, ...rest }: Props) {
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  styles.useVariants({ focused, invalid: !!error });
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, style]}
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
  wrap: { gap: theme.spacing.xs },
  input: {
    height: 46,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    fontSize: 15,
    color: theme.colors.text,
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
}));
