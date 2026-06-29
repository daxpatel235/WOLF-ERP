import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { z } from 'zod';

import { AuthField } from '@/components/auth/AuthField';
import { Button, PressableScale, Screen, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { secureStorage } from '@/store/storage';

const REMEMBER_KEY = 'wolf.auth.remember';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
});
type Form = z.infer<typeof schema>;

export default function LoginScreen() {
  const { theme } = useUnistyles();
  const signIn = useAuth((s) => s.signIn);
  const [submitting, setSubmitting] = useState(false);
  const [remember, setRemember] = useState(true);
  const [authError, setAuthError] = useState('');

  const { control, handleSubmit, formState, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  // Pre-fill the remembered email on mount.
  useEffect(() => {
    secureStorage.getItem(REMEMBER_KEY).then((saved) => {
      if (saved) setValue('email', saved);
      else setRemember(false);
    });
  }, [setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setAuthError('');
    try {
      if (remember) await secureStorage.setItem(REMEMBER_KEY, values.email);
      else await secureStorage.removeItem(REMEMBER_KEY);
      await signIn(values.email, values.password);
      // Auth gate handles navigation.
    } catch (e) {
      setAuthError((e as Error)?.message || 'Could not sign in. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)} style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="cube" size={30} style={styles.logoIcon} />
            </View>
            <Text variant="display">Welcome back</Text>
            <Text variant="body" color="textSecondary" center>
              Sign in to your Wolf workspace to continue.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.form}>
            <AuthField
              control={control}
              name="email"
              label="Work email"
              placeholder="you@company.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={formState.errors.email?.message}
            />
            <AuthField
              control={control}
              name="password"
              label="Password"
              placeholder="••••••••"
              icon="lock-closed-outline"
              secure
              error={formState.errors.password?.message}
            />

            <View style={styles.row}>
              <PressableScale haptic={false} onPress={() => setRemember((r) => !r)} style={styles.remember}>
                <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                  {remember ? <Ionicons name="checkmark" size={13} color={theme.colors.textOnPrimary} /> : null}
                </View>
                <Text variant="caption" color="textSecondary">
                  Remember me
                </Text>
              </PressableScale>
              <Link href="/(auth)/forgot-password" asChild>
                <PressableScale haptic={false}>
                  <Text variant="caption" color="primary">
                    Forgot password?
                  </Text>
                </PressableScale>
              </Link>
            </View>

            {authError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                <Text variant="caption" color="danger" style={styles.flex}>
                  {authError}
                </Text>
              </View>
            ) : null}

            <View style={styles.action}>
              <Button label="Sign in" size="lg" loading={submitting} onPress={onSubmit} />
            </View>

            <View style={styles.signupRow}>
              <Text variant="caption" color="textSecondary">
                New to Wolf?{' '}
              </Text>
              <Link href="/(auth)/register" asChild>
                <PressableScale haptic={false}>
                  <Text variant="caption" color="primary">
                    Create an account
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
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.huge,
    gap: theme.spacing.huge,
  },
  brand: { alignItems: 'center', gap: theme.spacing.sm },
  logo: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  logoIcon: { color: theme.colors.textOnPrimary },
  form: { gap: theme.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remember: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  action: { marginTop: theme.spacing.sm },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSoft,
  },
  signupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
}));
