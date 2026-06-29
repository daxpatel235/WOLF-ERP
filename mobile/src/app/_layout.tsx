// Unistyles must be configured before any StyleSheet.create runs.
import '@/theme/unistyles';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { warmUp } from '@/api/live';
import { queryClient } from '@/api/queryClient';
import { useAuth } from '@/store/auth';

// Keep the native splash up until we've hydrated auth and the entry route has
// resolved where to send the user — prevents a pre-hydration flash/navigation.
SplashScreen.preventAutoHideAsync();

/**
 * Keeps the auth flow and app shell in sync with session state. The INITIAL
 * landing is handled by `app/index.tsx` (a single auth-aware redirect); this
 * gate only reacts to runtime changes (sign-in / sign-out) after mount, so it
 * never fights the first navigation transaction.
 */
function useAuthGate() {
  const { hydrated, token, hydrate } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync();
    const group = segments[0];
    // Only correct an *inconsistent* location (e.g. signed out while in the
    // app, or signed in while on an auth screen). The entry route owns the
    // cold-start redirect, so we skip acting on the bare index ('' group).
    if (!group) return;
    const inAuthGroup = group === '(auth)';
    if (!token && !inAuthGroup) router.replace('/(auth)/login');
    else if (token && inAuthGroup) router.replace('/(app)');
  }, [hydrated, token, segments, router]);
}

function RootNavigator() {
  useAuthGate();
  // Start waking a sleeping backend immediately, in parallel with auth/splash.
  useEffect(() => {
    warmUp();
  }, []);
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="search" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ai-chat" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
