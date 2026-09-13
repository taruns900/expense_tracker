import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Input } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { config } from '@/config/env';
import { authService } from '@/services/auth';
import { useSessionStore } from '@/store';
import { toUserMessage } from '@/utils/userError';

const PIN_KEY = 'et.pin';

export default function SettingsScreen() {
  const cloudEmail = useSessionStore((state) => state.cloudEmail);
  const cloudUserId = useSessionStore((state) => state.cloudUserId);
  const signedIn = Boolean(cloudUserId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  function runAuth(action: () => Promise<void>, failedTitle: string) {
    setBusy(true);
    void action()
      .then(() => {
        setPassword('');
        Alert.alert('Signed in', 'This account’s cloud data is kept separate from other logins.');
      })
      .catch((error) => Alert.alert(failedTitle, toUserMessage(error, 'Check the API is running.')))
      .finally(() => setBusy(false));
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Account</Text>
      <Text style={styles.hint}>
        You can record expenses offline. Sign in to sync this account only to {config.apiBaseUrl}.
      </Text>
      {signedIn ? (
        <>
          <Text style={styles.body}>Signed in as {cloudEmail || 'your account'}.</Text>
          <Button
            label="Log out"
            variant="ghost"
            disabled={busy}
            onPress={() => {
              Alert.alert(
                'Log out?',
                'This device’s expenses and categories will be cleared. Cloud data stays with your account and comes back when you sign in again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: () => {
                      setBusy(true);
                      void authService
                        .logout()
                        .then(() => {
                          setEmail('');
                          setPassword('');
                        })
                        .finally(() => setBusy(false));
                    },
                  },
                ],
              );
            }}
          />
        </>
      ) : (
        <>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <Button
            label={busy ? 'Please wait' : 'Register'}
            disabled={busy}
            onPress={() => runAuth(() => authService.register(email, password), "Couldn't register")}
          />
          <Button
            label="Log in"
            variant="secondary"
            disabled={busy}
            onPress={() => runAuth(() => authService.login(email, password), "Couldn't log in")}
          />
        </>
      )}

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
  body: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
