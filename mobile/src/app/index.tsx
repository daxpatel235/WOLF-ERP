import { Redirect } from 'expo-router';

import { useAuth } from '@/store/auth';

// Single, auth-aware entry redirect. Waiting for `hydrated` (and routing
// straight to the correct group) avoids the (app)→(auth) double-navigation that
// raced react-native-screens into a "No view found for id" fragment crash on the
// first cold launch. The splash stays up while this returns null.
export default function Index() {
  const hydrated = useAuth((s) => s.hydrated);
  const token = useAuth((s) => s.token);
  if (!hydrated) return null;
  return <Redirect href={token ? '/(app)' : '/(auth)/login'} />;
}
