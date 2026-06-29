import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useAiStatus } from '@/api/hooks';
import { PressableScale } from '@/components/ui';
import { palette } from '@/theme/tokens';

/** Floating "Wolf AI" button — only shows when the backend has RAG chat enabled. */
export function AiFab() {
  const router = useRouter();
  const { data } = useAiStatus();
  if (!data?.chat) return null;
  return (
    <PressableScale haptic={false} scaleTo={0.92} onPress={() => router.push('/ai-chat')} style={styles.fab}>
      <Ionicons name="sparkles" size={24} color={palette.white} />
      <View style={styles.dot} />
    </PressableScale>
  );
}

const styles = StyleSheet.create((theme) => ({
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: 84,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: palette.violet600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.violet600,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: palette.white,
  },
}));
