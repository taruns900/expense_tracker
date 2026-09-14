import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { useSessionStore } from '@/store';

async function deviceCanUnlock(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

async function authenticateWithDevice(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Expense Tracker',
    fallbackLabel: 'Use device PIN',
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });
  return result.success;
}

export function AppLock({ children }: { children: ReactNode }) {
  const signedIn = Boolean(useSessionStore((state) => state.cloudUserId));
  const insets = useSafeAreaInsets();
  const [unlocked, setUnlocked] = useState(!signedIn);
  const [deviceLockAvailable, setDeviceLockAvailable] = useState(true);
  const [prompting, setPrompting] = useState(false);
  const promptingRef = useRef(false);

  const lock = useCallback(() => {
    setUnlocked(false);
  }, []);

  const tryUnlock = useCallback(async () => {
    if (promptingRef.current) {
      return;
    }
    promptingRef.current = true;
    setPrompting(true);
    try {
      const available = await deviceCanUnlock();
      setDeviceLockAvailable(available);
      if (!available) {
        return;
      }
      const success = await authenticateWithDevice();
      if (success) {
        setUnlocked(true);
      }
    } finally {
      promptingRef.current = false;
      setPrompting(false);
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setUnlocked(true);
      return;
    }
    setUnlocked(false);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || unlocked) {
      return;
    }
    void tryUnlock();
  }, [signedIn, unlocked, tryUnlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && signedIn) {
        lock();
      }
    });
    return () => sub.remove();
  }, [lock, signedIn]);

  if (!signedIn || unlocked) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.title}>Unlock</Text>
      <Text style={styles.body}>
        {deviceLockAvailable
          ? 'Use Face ID, fingerprint, or your phone PIN to open Expense Tracker.'
          : 'Set a screen lock on this phone (PIN, pattern, fingerprint, or Face ID), then try again.'}
      </Text>
      <Button label={prompting ? 'Waiting' : 'Unlock'} disabled={prompting} onPress={() => void tryUnlock()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
