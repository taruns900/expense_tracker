import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Input } from '@/components';
import { colors, spacing, typography } from '@/components/theme';

const PIN_KEY = 'et.pin';

async function canUseBiometrics(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Expense Tracker',
    cancelLabel: 'Use PIN',
  });
  return result.success;
}

export function AppLock({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [ready, setReady] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(PIN_KEY)
      .then((value) => {
        setLocked(Boolean(value));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const unlock = useCallback(() => {
    setLocked(false);
    setPin('');
  }, []);

  useEffect(() => {
    if (!ready || !locked) {
      return;
    }
    void canUseBiometrics().then(setBiometricsAvailable);
  }, [ready, locked]);

  useEffect(() => {
    if (!ready || !locked || !biometricsAvailable) {
      return;
    }
    void authenticateWithBiometrics().then((success) => {
      if (success) {
        unlock();
      }
    });
  }, [ready, locked, biometricsAvailable, unlock]);

  if (!ready) {
    return children;
  }

  if (!locked) {
    return children;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Unlock</Text>
      <Text style={styles.body}>Enter your PIN or use biometrics to open Expense Tracker.</Text>
      {biometricsAvailable ? (
        <Button
          label="Unlock with biometrics"
          onPress={() => {
            void authenticateWithBiometrics().then((success) => {
              if (success) {
                unlock();
              }
            });
          }}
        />
      ) : null}
      <Input label="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
      <Button
        label="Unlock with PIN"
        variant={biometricsAvailable ? 'secondary' : 'primary'}
        onPress={() => {
          void SecureStore.getItemAsync(PIN_KEY).then((stored) => {
            if (stored && stored === pin) {
              unlock();
            }
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
