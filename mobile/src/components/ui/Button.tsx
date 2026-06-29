import { ActivityIndicator, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
}: Props) {
  const isDisabled = disabled || loading;
  styles.useVariants({ variant, size, disabled: isDisabled });
  const labelColor =
    variant === 'primary' || variant === 'danger' ? 'textOnPrimary' : 'text';
  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.97}
      style={[styles.btn, fullWidth && styles.fullWidth]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#fff' : undefined} />
        ) : (
          <>
            {icon}
            <Text variant="bodyStrong" color={labelColor}>
              {label}
            </Text>
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  fullWidth: { alignSelf: 'stretch' },
  btn: {
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    variants: {
      size: {
        md: { height: 46 },
        lg: { height: 54 },
      },
      variant: {
        primary: { backgroundColor: theme.colors.primary },
        secondary: {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        ghost: { backgroundColor: 'transparent' },
        danger: { backgroundColor: theme.colors.danger },
      },
      disabled: {
        true: { opacity: 0.5 },
        false: {},
      },
    },
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
}));
