import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Avatar, Button, Card, NavHeader, Screen, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';

type IconName = keyof typeof Ionicons.glyphMap;

export default function SettingsScreen() {
  const { theme } = useUnistyles();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    approvalAlerts: true,
    compactTables: false,
  });
  const toggle = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Settings" subtitle="Profile & preferences" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Card style={styles.card}>
          <Text variant="heading">Profile</Text>
          <View style={styles.profileRow}>
            <Avatar name={user?.name ?? 'Wolf User'} size={56} />
            <View>
              <Text variant="bodyStrong">{user?.name}</Text>
              <Text variant="caption" color="textSecondary" style={styles.cap}>
                {user?.role}
              </Text>
            </View>
          </View>
          <View style={styles.infoGrid}>
            <Info icon="person-outline" label="Full name" value={user?.name ?? '—'} />
            <Info icon="mail-outline" label="Email" value={user?.email ?? '—'} />
            <Info icon="shield-outline" label="Role" value={user?.role ?? '—'} cap />
            <Info icon="business-outline" label="Company" value={user?.company ?? '—'} />
          </View>
        </Card>

        {/* Preferences */}
        <Card padded={false} style={styles.card}>
          <View style={styles.prefHead}>
            <Text variant="heading">Preferences</Text>
            <Text variant="caption" color="textSecondary">
              Saved on this device.
            </Text>
          </View>
          <Toggle
            icon="notifications-outline"
            label="Email notifications"
            hint="Get an email when something needs attention."
            value={prefs.emailNotifications}
            onChange={() => toggle('emailNotifications')}
          />
          <Toggle
            icon="shield-checkmark-outline"
            label="Approval alerts"
            hint="Notify me when an item awaits my sign-off."
            value={prefs.approvalAlerts}
            onChange={() => toggle('approvalAlerts')}
            border
          />
          <Toggle
            icon="grid-outline"
            label="Compact lists"
            hint="Tighten spacing to show more rows."
            value={prefs.compactTables}
            onChange={() => toggle('compactTables')}
            border
          />
        </Card>

        {/* Sign out */}
        <Card style={styles.signOutCard}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">Sign out</Text>
            <Text variant="caption" color="textSecondary">
              End your session on this device.
            </Text>
          </View>
          <Button
            label="Sign out"
            variant="danger"
            fullWidth={false}
            icon={<Ionicons name="log-out-outline" size={18} color={theme.colors.textOnPrimary} />}
            onPress={signOut}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Info({ icon, label, value, cap }: { icon: IconName; label: string; value: string; cap?: boolean }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={16} color={theme.colors.textMuted} />
      <View style={styles.flex}>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <Text variant="body" style={cap ? styles.cap : undefined} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Toggle({
  icon,
  label,
  hint,
  value,
  onChange,
  border,
}: {
  icon: IconName;
  label: string;
  hint: string;
  value: boolean;
  onChange: () => void;
  border?: boolean;
}) {
  const { theme } = useUnistyles();
  return (
    <View style={[styles.toggle, border && styles.toggleBorder]}>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      <View style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  flex: { flex: 1 },
  cap: { textTransform: 'capitalize' },
  card: { gap: theme.spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  infoGrid: { gap: theme.spacing.md },
  info: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  prefHead: { padding: theme.spacing.lg, gap: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg },
  toggleBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  signOutCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
}));
