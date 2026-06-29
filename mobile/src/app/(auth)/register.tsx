import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { z } from 'zod';

import { AuthField } from '@/components/auth/AuthField';
import { Button, NavHeader, PressableScale, Screen, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';
import type { Role } from '@/types/domain';

const ROLES: { value: Role; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'buyer', label: 'Buyer', icon: 'cart-outline' },
  { value: 'manager', label: 'Manager', icon: 'briefcase-outline' },
  { value: 'approver', label: 'Approver', icon: 'checkmark-done-outline' },
];

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type Form = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<Role>('manager');
  const [authError, setAuthError] = useState('');

  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setAuthError('');
    try {
      await register(values.name, values.email, values.password, role);
      // Auth gate redirects into the app once the token is set.
    } catch (e) {
      setAuthError((e as Error)?.message || 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Create account" subtitle="Start your Wolf workspace" onBack={() => router.replace('/(auth)/login')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.form}>
            <AuthField control={control} name="name" label="Full name" placeholder="Jordan Mehta" icon="person-outline" autoCapitalize="words" error={formState.errors.name?.message} />
            <AuthField control={control} name="email" label="Work email" placeholder="you@company.com" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={formState.errors.email?.message} />
            <AuthField control={control} name="password" label="Password" placeholder="••••••••" icon="lock-closed-outline" secure error={formState.errors.password?.message} />
            <AuthField control={control} name="confirm" label="Confirm password" placeholder="••••••••" icon="lock-closed-outline" secure error={formState.errors.confirm?.message} />

            <View style={styles.roleBlock}>
              <Text variant="label" color="textSecondary">
                I am a…
              </Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => {
                  const on = role === r.value;
                  return (
                    <PressableScale
                      key={r.value}
                      haptic={false}
                      scaleTo={0.96}
                      onPress={() => setRole(r.value)}
                      style={[styles.roleChip, on && styles.roleChipOn]}
                    >
                      <Ionicons name={r.icon} size={18} style={on ? styles.roleIconOn : styles.roleIcon} />
                      <Text variant="caption" color={on ? 'primary' : 'textSecondary'} style={styles.roleLabel}>
                        {r.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.footer}>
            {authError ? (
              <View style={styles.errorBox}>
                <Text variant="caption" color="danger">
                  {authError}
                </Text>
              </View>
            ) : null}
            <Button label="Create account" size="lg" loading={submitting} onPress={onSubmit} />
            <View style={styles.loginRow}>
              <Text variant="caption" color="textSecondary">
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/login" asChild>
                <PressableScale haptic={false}>
                  <Text variant="caption" color="primary">
                    Sign in
                  </Text>
                </PressableScale>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg, gap: theme.spacing.xl },
  form: { gap: theme.spacing.lg },
  roleBlock: { gap: theme.spacing.sm },
  roleRow: { flexDirection: 'row', gap: theme.spacing.sm },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  roleChipOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  roleIcon: { color: theme.colors.textSecondary },
  roleIconOn: { color: theme.colors.primary },
  roleLabel: { fontWeight: '600' },
  footer: { gap: theme.spacing.md },
  errorBox: { padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.dangerSoft },
  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
}));
