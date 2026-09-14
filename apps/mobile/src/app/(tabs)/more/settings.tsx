import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { authService } from '@/services/auth';
import { useSessionStore } from '@/store';
import { useState } from 'react';

export default function SettingsScreen() {
  const cloudName = useSessionStore((state) => state.cloudName);
  const cloudPhone = useSessionStore((state) => state.cloudPhone);
  const cloudRecoveryEmail = useSessionStore((state) => state.cloudRecoveryEmail);
  const [busy, setBusy] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
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
