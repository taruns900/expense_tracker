import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import {
  authenticateBiometric,
  enabledUnlockBiometrics,
  type BiometricSettings,
} from '@/services/appBiometrics';
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
  const [biometrics, setBiometrics] = useState<BiometricSettings>({ face: false, fingerprint: false });
  const [needsCreate, setNeedsCreate] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const promptingRef = useRef(false);

  const lockRequired = hasPin || biometrics.face || biometrics.fingerprint;

  const loadLockState = useCallback(async (lockIfConfigured: boolean) => {
    const stored = await getAppPin();
    const configured = Boolean(stored);
    const dismissed = await wasPinPromptDismissed();
    const nextBiometrics = await enabledUnlockBiometrics();
    setHasPin(configured);
    setBiometrics(nextBiometrics);
    setNeedsCreate(!configured && !dismissed);
    const shouldLock = configured || nextBiometrics.face || nextBiometrics.fingerprint;
    if (shouldLock && lockIfConfigured) {
      setUnlocked(false);
    } else if (!configured) {
      setUnlocked(dismissed);
    }
    setReady(true);
  }, []);

  const unlock = useCallback(() => {
    setUnlocked(true);
    setPin('');
  }, []);

  const tryBiometric = useCallback(
    async (kind: 'face' | 'fingerprint') => {
      if (promptingRef.current) {
        return;
      }
      promptingRef.current = true;
      try {
        const success = await authenticateBiometric(kind);
        if (success) {
          unlock();
        }
      } finally {
        promptingRef.current = false;
      }
    },
    [unlock],
  );

  useEffect(() => {
    if (!signedIn) {
      setReady(true);
      setHasPin(false);
      setBiometrics({ face: false, fingerprint: false });
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
      if (next === 'background' && lockRequired) {
        setUnlocked(false);
        setPin('');
      }
      if (next === 'active') {
        void Promise.all([getAppPin(), enabledUnlockBiometrics()]).then(([stored, nextBiometrics]) => {
          setHasPin(Boolean(stored));
          setBiometrics(nextBiometrics);
        });
      }
    });
    return () => sub.remove();
  }, [lockRequired, signedIn]);

  useEffect(() => {
    if (!signedIn || unlocked || !ready || needsCreate) {
      return;
    }
    if (biometrics.face) {
      void tryBiometric('face');
      return;
    }
    if (biometrics.fingerprint) {
      void tryBiometric('fingerprint');
    }
  }, [biometrics.face, biometrics.fingerprint, needsCreate, ready, signedIn, tryBiometric, unlocked]);

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

  if (!lockRequired || unlocked) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.title}>Unlock</Text>
      {biometrics.face ? (
        <Button label="Unlock with Face" onPress={() => void tryBiometric('face')} />
      ) : null}
      {biometrics.fingerprint ? (
        <Button label="Unlock with fingerprint" onPress={() => void tryBiometric('fingerprint')} />
      ) : null}
      {hasPin ? (
        <>
          <Input label="App PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
          <Button
            label="Unlock with PIN"
            variant={biometrics.face || biometrics.fingerprint ? 'secondary' : 'primary'}
            onPress={() => {
              void getAppPin().then((stored) => {
                if (stored && stored === pin) {
                  unlock();
                  return;
                }
                Alert.alert('PIN', 'That PIN is incorrect.');
              });
            }}
          />
        </>
      ) : null}
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
