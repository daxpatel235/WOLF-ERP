import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { z } from 'zod';

import { USE_LIVE } from '@/api/client';
import { liveAuth } from '@/api/live';
import { AuthField } from '@/components/auth/AuthField';
import { Button, NavHeader, PressableScale, Screen, Text } from '@/components/ui';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (USE_LIVE) await liveAuth.forgotPassword(values.email);
      else await new Promise((r) => setTimeout(r, 500));
      // Server responds identically whether or not the email exists.
      setSentTo(values.email);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Reset password" subtitle="We'll email you a reset link" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {sentTo ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.success}>
              <View style={styles.successIcon}>
                <Ionicons name="mail-open-outline" size={32} color={theme.colors.primary} />
              </View>
              <Text variant="title" center>
                Check your inbox
              </Text>
              <Text variant="body" color="textSecondary" center>
                We&apos;ve sent a password reset link to{'\n'}
                <Text variant="bodyStrong">{sentTo}</Text>.
              </Text>
              <View style={styles.successActions}>
                <Button label="Enter reset code" size="lg" onPress={() => router.push('/(auth)/reset-password')} />
                <Link href="/(auth)/login" asChild>
                  <PressableScale haptic={false} style={styles.backLink}>
                    <Text variant="caption" color="primary">
                      Back to sign in
                    </Text>
                  </PressableScale>
                </Link>
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.duration(360)} style={styles.form}>
              <Text variant="body" color="textSecondary">
                Enter the email tied to your workspace and we&apos;ll send you instructions to reset your password.
              </Text>
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
              <Button label="Send reset link" size="lg" loading={submitting} onPress={onSubmit} />
              <Link href="/(auth)/login" asChild>
                <PressableScale haptic={false} style={styles.backLink}>
                  <Text variant="caption" color="primary">
                    Back to sign in
                  </Text>
                </PressableScale>
              </Link>
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
  backLink: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  success: { alignItems: 'center', gap: theme.spacing.md },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  successActions: { alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.lg },
}));
