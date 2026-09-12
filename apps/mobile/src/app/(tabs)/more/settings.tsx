import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Input } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { config } from '@/config/env';
import { authService } from '@/services/auth';
import { toUserMessage } from '@/utils/userError';

const PIN_KEY = 'et.pin';

export default function SettingsScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Account</Text>
      <Text style={styles.hint}>
        Cloud credentials stay on the server. This app talks to {config.apiBaseUrl} ({config.cloudMode} mode).
        Replace the dummy values later.
      </Text>
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button
        label="Register"
        onPress={() => {
          void authService
            .register(email, password)
            .then(() => Alert.alert('Signed in', 'Tokens are stored in secure storage.'))
            .catch((error) => Alert.alert("Couldn't register", toUserMessage(error, 'Check the API is running.')));
        }}
      />
      <Button
        label="Log in"
        variant="secondary"
        onPress={() => {
          void authService
            .login(email, password)
            .then(() => Alert.alert('Signed in', 'Tokens are stored in secure storage.'))
            .catch((error) => Alert.alert("Couldn't log in", toUserMessage(error, 'Check your email and password.')));
        }}
      />
      <Button label="Log out" variant="ghost" onPress={() => void authService.logout()} />

      <Text style={styles.title}>App lock</Text>
      <Input label="PIN (4+ digits)" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
      <Button
        label="Save PIN"
        variant="secondary"
        onPress={() => {
          if (pin.length < 4) {
            Alert.alert('PIN', 'Use at least 4 digits.');
            return;
          }
          void SecureStore.setItemAsync(PIN_KEY, pin).then(() => Alert.alert('Saved', 'PIN lock is on.'));
        }}
      />
      <Button
        label="Remove PIN"
        variant="ghost"
        onPress={() => {
          void SecureStore.deleteItemAsync(PIN_KEY);
        }}
      />
      <Button
        label="Test biometrics"
        variant="ghost"
        onPress={() => {
          void LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Expense Tracker' }).then((result) => {
            Alert.alert(result.success ? 'Unlocked' : 'Not unlocked', result.success ? 'Biometrics work on this device.' : 'Try again.');
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
  title: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
