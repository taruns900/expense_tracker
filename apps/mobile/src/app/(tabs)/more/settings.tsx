import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Input } from '@/components';
import { colors, spacing, touchTarget, typography } from '@/components/theme';
import { authService } from '@/services/auth';
import {
  getBiometricAvailability,
  getBiometricSettings,
  setBiometricEnabled,
  type BiometricAvailability,
  type BiometricSettings,
} from '@/services/appBiometrics';
import { clearAppPin, getAppPin, isValidAppPin, setAppPin } from '@/services/appPin';
import { useSessionStore } from '@/store';

export default function SettingsScreen() {
  const cloudName = useSessionStore((state) => state.cloudName);
  const cloudPhone = useSessionStore((state) => state.cloudPhone);
  const cloudRecoveryEmail = useSessionStore((state) => state.cloudRecoveryEmail);
  const [busy, setBusy] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [available, setAvailable] = useState<BiometricAvailability>({ face: false, fingerprint: false });
  const [biometrics, setBiometrics] = useState<BiometricSettings>({ face: false, fingerprint: false });

  const loadLockSettings = useCallback(async () => {
    const [stored, nextAvailable, nextSettings] = await Promise.all([
      getAppPin(),
      getBiometricAvailability(),
      getBiometricSettings(),
    ]);
    setHasPin(Boolean(stored));
    setAvailable(nextAvailable);
    setBiometrics({
      face: nextAvailable.face && nextSettings.face,
      fingerprint: nextAvailable.fingerprint && nextSettings.fingerprint,
    });
  }, []);

  useEffect(() => {
    void loadLockSettings();
  }, [loadLockSettings]);

  function savePin() {
    if (!isValidAppPin(pin)) {
      Alert.alert('PIN', 'Use at least 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('PIN', 'The PIN and confirmation do not match.');
      return;
    }
    void setAppPin(pin).then(() => {
      setHasPin(true);
      setPin('');
      setConfirmPin('');
      Alert.alert('Saved', hasPin ? 'App PIN updated.' : 'App PIN created.');
    });
  }

  function toggleBiometric(kind: 'face' | 'fingerprint', enabled: boolean) {
    void setBiometricEnabled(kind, enabled).then(() => {
      setBiometrics((current) => ({ ...current, [kind]: enabled }));
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Account</Text>
      <Text style={styles.body}>{cloudName || 'Signed in'}</Text>
      <Text style={styles.hint}>Phone {cloudPhone || '—'}</Text>
      <Text style={styles.hint}>Recovery email {cloudRecoveryEmail || '—'}</Text>
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
                  void authService.logout().finally(() => setBusy(false));
                },
              },
            ],
          );
        }}
      />

      <Text style={styles.title}>App PIN</Text>
      <Input label="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
      <Input
        label="Confirm PIN"
        value={confirmPin}
        onChangeText={setConfirmPin}
        keyboardType="number-pad"
        secureTextEntry
      />
      <Button label={hasPin ? 'Update PIN' : 'Create PIN'} onPress={savePin} />
      {hasPin ? (
        <Button
          label="Remove PIN"
          variant="ghost"
          onPress={() => {
            void clearAppPin().then(() => {
              setHasPin(false);
              setPin('');
              setConfirmPin('');
            });
          }}
        />
      ) : null}

      {available.face || available.fingerprint ? <Text style={styles.title}>Biometrics</Text> : null}
      {available.face ? (
        <View style={styles.toggleRow}>
          <Text style={styles.body}>Face</Text>
          <Switch
            value={biometrics.face}
            onValueChange={(value) => toggleBiometric('face', value)}
            trackColor={{ false: colors.border, true: colors.primaryMuted }}
            thumbColor={biometrics.face ? colors.primary : colors.tabInactive}
          />
        </View>
      ) : null}
      {available.fingerprint ? (
        <View style={styles.toggleRow}>
          <Text style={styles.body}>Fingerprint</Text>
          <Switch
            value={biometrics.fingerprint}
            onValueChange={(value) => toggleBiometric('fingerprint', value)}
            trackColor={{ false: colors.border, true: colors.primaryMuted }}
            thumbColor={biometrics.fingerprint ? colors.primary : colors.tabInactive}
          />
        </View>
      ) : null}
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
  toggleRow: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
