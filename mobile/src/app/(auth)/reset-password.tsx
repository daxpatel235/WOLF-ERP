import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { z } from 'zod';

import { USE_LIVE } from '@/api/client';
import { liveAuth } from '@/api/live';
import { AuthField } from '@/components/auth/AuthField';
import { Button, NavHeader, Screen, Text } from '@/components/ui';

const schema = z
  .object({
    code: z.string().min(4, 'Enter the 6-digit code'),
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type Form = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [error, setError] = useState('');
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', password: '', confirm: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError('');
    try {
      // Live: the "code" is the reset token from the emailed link.
      if (USE_LIVE) await liveAuth.resetPassword(values.code, values.password);
      else await new Promise((r) => setTimeout(r, 500));
      setDone(true);
    } catch {
      setError('Could not reset the password. Check your code and try again.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Set a new password" subtitle="Choose a strong, unique password" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {done ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.success}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle-outline" size={36} color={theme.colors.success} />
              </View>
              <Text variant="title" center>
                Password updated
              </Text>
              <Text variant="body" color="textSecondary" center>
                You can now sign in with your new password.
              </Text>
              <View style={styles.successActions}>
                <Button label="Back to sign in" size="lg" onPress={() => router.replace('/(auth)/login')} />
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.duration(360)} style={styles.form}>
              <AuthField
                control={control}
                name="code"
                label="Reset code"
                placeholder="6-digit code from your email"
                icon="key-outline"
                keyboardType="number-pad"
                error={formState.errors.code?.message}
              />
              <AuthField control={control} name="password" label="New password" placeholder="••••••••" icon="lock-closed-outline" secure error={formState.errors.password?.message} />
              <AuthField control={control} name="confirm" label="Confirm password" placeholder="••••••••" icon="lock-closed-outline" secure error={formState.errors.confirm?.message} />
              {error ? (
                <Text variant="caption" color="danger">
                  {error}
                </Text>
              ) : null}
              <Button label="Update password" size="lg" loading={submitting} onPress={onSubmit} />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.huge },
  form: { gap: theme.spacing.lg },
  success: { alignItems: 'center', gap: theme.spacing.md },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  successActions: { alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
}));
