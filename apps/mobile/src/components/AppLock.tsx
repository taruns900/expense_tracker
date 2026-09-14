import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, AppState, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import {
  dismissPinPrompt,
  getAppPin,
  isValidAppPin,
  setAppPin,
  wasPinPromptDismissed,
} from '@/services/appPin';
import { useSessionStore } from '@/store';

export function AppLock({ children }: { children: ReactNode }) {
  const signedIn = Boolean(useSessionStore((state) => state.cloudUserId));
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [needsCreate, setNeedsCreate] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const loadLockState = useCallback(async (lockIfConfigured: boolean) => {
    const stored = await getAppPin();
    const configured = Boolean(stored);
    const dismissed = await wasPinPromptDismissed();
    setHasPin(configured);
    setNeedsCreate(!configured && !dismissed);
    if (configured && lockIfConfigured) {
      setUnlocked(false);
    } else if (!configured) {
      setUnlocked(dismissed);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setReady(true);
      setHasPin(false);
      setNeedsCreate(false);
      setUnlocked(true);
      setPin('');
      setConfirmPin('');
      return;
    }
    setReady(false);
    void loadLockState(true);
  }, [signedIn, loadLockState]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (!signedIn) {
        return;
      }
      if (next === 'background' && hasPin) {
        setUnlocked(false);
        setPin('');
      }
      if (next === 'active') {
        void getAppPin().then((stored) => setHasPin(Boolean(stored)));
      }
    });
    return () => sub.remove();
  }, [hasPin, signedIn]);

  if (!signedIn) {
    return <>{children}</>;
  }

  if (!ready) {
    return <View style={styles.wrap} />;
  }

  if (needsCreate && !hasPin) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.title}>App PIN</Text>
        <Input label="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
        <Input
          label="Confirm PIN"
          value={confirmPin}
          onChangeText={setConfirmPin}
          keyboardType="number-pad"
          secureTextEntry
        />
        <Button
          label="Save PIN"
          onPress={() => {
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
              setNeedsCreate(false);
              setUnlocked(true);
              setPin('');
              setConfirmPin('');
            });
          }}
        />
        <Button
          label="Not now"
          variant="ghost"
          onPress={() => {
            void dismissPinPrompt().then(() => {
              setNeedsCreate(false);
              setUnlocked(true);
            });
          }}
        />
      </View>
    );
  }

  if (!hasPin || unlocked) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.title}>Unlock</Text>
      <Input label="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
      <Button
        label="Unlock"
        onPress={() => {
          void getAppPin().then((stored) => {
            if (stored && stored === pin) {
              setUnlocked(true);
              setPin('');
              return;
            }
            Alert.alert('PIN', 'That PIN is incorrect.');
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
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
});
