/** Later version — Business profile is not linked from More and is not synced. */
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { Button, Input } from '@/components';
import { colors, spacing } from '@/components/theme';
import { businessProfileService } from '@/features/businessProfile/businessProfileService';
import { toUserMessage } from '@/utils/userError';

export default function BusinessProfileScreen() {
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  useEffect(() => {
    void businessProfileService.get().then((profile) => {
      if (!profile) {
        return;
      }
      setBusinessName(profile.businessName ?? '');
      setAddress(profile.address ?? '');
      setPhone(profile.phone ?? '');
      setEmail(profile.email ?? '');
      setGstNumber(profile.gstNumber ?? '');
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Input label="Business name" value={businessName} onChangeText={setBusinessName} />
      <Input label="Address" value={address} onChangeText={setAddress} />
      <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Input label="GST number" value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" />
      <Button
        label="Save"
        onPress={() => {
          void businessProfileService
            .save({ businessName, address, phone, email, gstNumber })
            .then(() => Alert.alert('Saved', 'Business profile is stored on this device.'))
            .catch((error) => {
              Alert.alert("Couldn't save", toUserMessage(error, "The profile couldn't be saved."));
            });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
