import { useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { authService } from '@/services/auth';
import { useSessionStore } from '@/store';
import { toUserMessage } from '@/utils/userError';

export function AuthGate({ children }: { children: ReactNode }) {
  const signedIn = Boolean(useSessionStore((state) => state.cloudUserId));
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (signedIn) {
    return <>{children}</>;
  }

  function submit() {
    setBusy(true);
    const action =
      mode === 'login'
        ? authService.login(phone, password)
        : authService.register({ name, phone, recoveryEmail, password });
    void action
      .then(() => {
        setPassword('');
      })
      .catch((error) =>
        Alert.alert(
          mode === 'login' ? "Couldn't log in" : "Couldn't create account",
          toUserMessage(error, 'Check the API is running.'),
        ),
      )
      .finally(() => setBusy(false));
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.wrap,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode === 'login' ? 'Log in' : 'Create account'}</Text>
        {mode === 'signup' ? (
          <Input label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        ) : null}
        <Input
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        {mode === 'signup' ? (
          <Input
            label="Recovery email"
            value={recoveryEmail}
            onChangeText={setRecoveryEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : null}
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button
          label={busy ? 'Please wait' : mode === 'login' ? 'Log in' : 'Sign up'}
          disabled={busy}
          onPress={submit}
        />
        <Button
          label={mode === 'login' ? 'New user? Sign up' : 'Have an account? Log in'}
          variant="ghost"
          disabled={busy}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrap: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
});
