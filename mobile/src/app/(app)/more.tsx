import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Avatar, Card, PressableScale, Screen, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';

type IconName = keyof typeof Ionicons.glyphMap;
type Item = { label: string; sub: string; icon: IconName; href: string; tint: string };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Procurement',
    items: [
      { label: 'RFQs', sub: 'Requests for quotation', icon: 'document-text-outline', href: '/rfqs', tint: '#7C3AED' },
      { label: 'Quotations', sub: 'Vendor quotes & comparison', icon: 'pricetags-outline', href: '/quotations', tint: '#0891B2' },
      { label: 'Invoices', sub: 'Billing & payments', icon: 'card-outline', href: '/invoices', tint: '#2563EB' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports', sub: 'Spend analytics', icon: 'bar-chart-outline', href: '/reports', tint: '#059669' },
      { label: 'Activity', sub: 'Workspace audit feed', icon: 'pulse-outline', href: '/activity', tint: '#D97706' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', sub: 'Profile & preferences', icon: 'settings-outline', href: '/settings', tint: '#475569' },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const user = useAuth((s) => s.user);

  return (
    <Screen tone="surfaceAlt">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="title" style={styles.title}>
          More
        </Text>

        {/* Profile card */}
        <Card onPress={() => router.push('/settings')} style={styles.profile}>
          <Avatar name={user?.name ?? 'Wolf User'} size={48} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{user?.name ?? 'Wolf User'}</Text>
            <Text variant="caption" color="textSecondary" style={styles.role}>
              {user?.role ?? 'manager'} · {user?.company ?? 'Wolf Industries'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </Card>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="label" color="textSecondary" style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Text>
            <Card padded={false}>
              {section.items.map((item, i) => (
                <PressableScale
                  key={item.label}
                  haptic={false}
                  scaleTo={0.99}
                  onPress={() => router.push(item.href as never)}
                  style={[styles.row, i > 0 && styles.rowBorder]}
                >
                  <View style={[styles.iconBadge, { backgroundColor: item.tint + '18' }]}>
                    <Ionicons name={item.icon} size={20} color={item.tint} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{item.label}</Text>
                    <Text variant="caption" color="textSecondary">
                      {item.sub}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </PressableScale>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  title: { paddingTop: theme.spacing.xs },
  flex: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  role: { textTransform: 'capitalize' },
  section: { gap: theme.spacing.sm },
  sectionTitle: { letterSpacing: 0.5, paddingHorizontal: theme.spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  iconBadge: { width: 40, height: 40, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
}));
