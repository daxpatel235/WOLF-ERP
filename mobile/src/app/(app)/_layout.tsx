import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { useApprovals } from '@/api/hooks';
import { AiFab } from '@/components/ai/AiFab';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'grid', inactive: 'grid-outline' },
  orders: { active: 'receipt', inactive: 'receipt-outline' },
  approvals: { active: 'checkmark-done-circle', inactive: 'checkmark-done-circle-outline' },
  vendors: { active: 'business', inactive: 'business-outline' },
  more: { active: 'ellipsis-horizontal-circle', inactive: 'ellipsis-horizontal-circle-outline' },
};

export default function AppTabsLayout() {
  const { theme } = useUnistyles();
  const { data: approvals } = useApprovals();
  const pendingCount = approvals?.pending.length ?? 0;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const set = ICONS[route.name] ?? ICONS.index;
          return <Ionicons name={focused ? set.active : set.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen
        name="approvals"
        options={{ title: 'Approvals', tabBarBadge: pendingCount > 0 ? pendingCount : undefined }}
      />
      <Tabs.Screen name="vendors" options={{ title: 'Vendors' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
    <AiFab />
    </View>
  );
}
