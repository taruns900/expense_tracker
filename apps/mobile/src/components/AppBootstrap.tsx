import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/components/theme';
import { getSchemaVersion, initializeDatabase } from '@/database';
import { authService } from '@/services/auth';
import { syncEngine } from '@/services/sync';
import { useSessionStore } from '@/store';

type Props = {
  children: ReactNode;
};

export function AppBootstrap({ children }: Props) {
  const isDatabaseReady = useSessionStore((state) => state.isDatabaseReady);
  const databaseError = useSessionStore((state) => state.databaseError);
  const markDatabaseReady = useSessionStore((state) => state.markDatabaseReady);
  const markDatabaseError = useSessionStore((state) => state.markDatabaseError);

  useEffect(() => {
    let cancelled = false;
    const stopWatching = syncEngine.watchConnectivity();
    const timer = setInterval(() => {
      void syncEngine.run();
    }, 20000);

    initializeDatabase()
      .then(async () => {
        if (cancelled) {
          return;
        }
        await authService.hydrate();
        markDatabaseReady(getSchemaVersion());
        void syncEngine.run();
      })
      .catch(() => {
        if (!cancelled) {
          markDatabaseError("Couldn't start the app. Please try again.");
        }
      });

    return () => {
      cancelled = true;
      stopWatching();
      clearInterval(timer);
    };
  }, [markDatabaseError, markDatabaseReady]);

  if (databaseError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{databaseError}</Text>
      </View>
    );
  }

  if (!isDatabaseReady) {
    return (
      <View style={styles.center} accessibilityLabel="Loading">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
