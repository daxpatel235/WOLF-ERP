import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useCreateVendor } from '@/api/hooks';
import { Input } from '@/components/form/Input';
import { Select } from '@/components/form/Select';
import { Button, Card, NavHeader, Screen, Text } from '@/components/ui';
import type { Vendor } from '@/types/domain';

const CATEGORIES = ['Raw Materials', 'Electronics', 'Logistics', 'Packaging', 'Tooling', 'Chemicals', 'IT Services'];
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ label: c, value: c }));
const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Inactive', value: 'inactive' },
];

const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export default function NewVendorScreen() {
  const router = useRouter();
  const create = useCreateVendor();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [status, setStatus] = useState<Vendor['status']>('active');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Vendor name is required');
    if (!contact.trim()) return setError('Primary contact is required');
    if (!emailValid(email)) return setError('Enter a valid email');
    try {
      const vendor = await create.mutateAsync({
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gstin: gstin.trim(),
        city: city.trim() || '—',
        category,
        status,
      });
      router.replace(`/vendor/${vendor.id}`);
    } catch {
      setError('Could not save vendor.');
    }
  };

  return (
    <Screen tone="surfaceAlt" edges={['top', 'left', 'right']}>
      <NavHeader title="Add vendor" subtitle="Register a new supplier" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            <Input label="Vendor name" value={name} onChangeText={setName} placeholder="Acme Corp" />
            <Input label="Primary contact" value={contact} onChangeText={setContact} placeholder="Full name" />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="vendor@company.com" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 …" keyboardType="phone-pad" />
            <Input label="GSTIN" value={gstin} onChangeText={setGstin} placeholder="27ABCDE1234F1Z5" autoCapitalize="characters" />
            <Input label="Location" value={city} onChangeText={setCity} placeholder="City, State" />
            <Select label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
            <Select label="Status" value={status} options={STATUS_OPTIONS} onChange={(v) => setStatus(v as Vendor['status'])} />

            {error ? (
              <Text variant="caption" color="danger">
                {error}
              </Text>
            ) : null}
          </Card>

          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
            </View>
            <View style={styles.flex}>
              <Button label="Save vendor" loading={create.isPending} onPress={submit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.huge },
  card: { gap: theme.spacing.lg },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
}));
