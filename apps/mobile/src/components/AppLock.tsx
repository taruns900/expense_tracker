import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Input } from '@/components';
import { colors, spacing, typography } from '@/components/theme';

const PIN_KEY = 'et.pin';

export function AppLock({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(PIN_KEY)
      .then((value) => {
        setLocked(Boolean(value));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return children;
  }

  if (!locked) {
    return children;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Unlock</Text>
      <Text style={styles.body}>Enter your PIN to open Expense Tracker.</Text>
      <Input label="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
      <Button
        label="Unlock"
        onPress={() => {
          void SecureStore.getItemAsync(PIN_KEY).then((stored) => {
            if (stored && stored === pin) {
              setLocked(false);
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
