import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { config } from '@/config/env';
import { exportService } from '@/services/export';
import { syncEngine } from '@/services/sync';
import { useSessionStore } from '@/store';
import { toUserMessage } from '@/utils/userError';

export default function DataManagementScreen() {
  const cloudEmail = useSessionStore((state) => state.cloudEmail);
  const cloudUserId = useSessionStore((state) => state.cloudUserId);
  const [counts, setCounts] = useState({ pending: 0, failed: 0, synced: 0 });
  const [online, setOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setCounts(await syncEngine.status());
    setOnline(await syncEngine.isOnline());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Sync status</Text>
      <Text style={styles.body}>
        Account: {cloudUserId ? cloudEmail || 'Signed in' : 'Not signed in (local only)'}
      </Text>
      <Text style={styles.body}>Cloud mode: {config.cloudMode}</Text>
      <Text style={styles.body}>API: {config.apiBaseUrl}</Text>
      <Text style={styles.body}>Network: {online ? 'Available' : 'Offline or unknown'}</Text>
      <Text style={styles.body}>Pending: {counts.pending}</Text>
      <Text style={styles.body}>Failed: {counts.failed}</Text>
      <Text style={styles.body}>Synced: {counts.synced}</Text>
      <Text style={styles.hint}>
        Sync runs automatically. If something fails you will see: Some changes couldn’t be synced. We’ll
        try again automatically.
      </Text>
      <Button
        label={syncing ? 'Syncing…' : 'Try sync now'}
        disabled={syncing}
        onPress={() => {
          setSyncing(true);
          void syncEngine
            .run({ manual: true })
            .then(async () => {
              await load();
              Alert.alert('Sync', 'Your latest changes are synced with the cloud.');
            })
            .catch((error) => {
              Alert.alert(
                'Sync',
                toUserMessage(error, 'Some changes couldn’t be synced. We’ll try again automatically.'),
              );
            })
            .finally(() => {
              setSyncing(false);
            });
        }}
      />
      <Button
        label="Export data"
        variant="secondary"
        onPress={() => {
          void exportService.shareJsonBackup().catch((error) => {
            Alert.alert("Couldn't export", toUserMessage(error, "The export couldn't be created."));
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginVertical: spacing.sm,
  },
});
