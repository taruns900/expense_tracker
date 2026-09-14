import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const FACE_KEY = 'et.unlock.face';
const FINGERPRINT_KEY = 'et.unlock.fingerprint';

export type BiometricKind = 'face' | 'fingerprint';

export type BiometricAvailability = {
  face: boolean;
  fingerprint: boolean;
};

export type BiometricSettings = {
  face: boolean;
  fingerprint: boolean;
};

async function readFlag(key: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(key)) === '1';
  } catch {
    return false;
  }
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return { face: false, fingerprint: false };
    }
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return {
      face: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      fingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
    };
  } catch {
    return { face: false, fingerprint: false };
  }
}

export async function getBiometricSettings(): Promise<BiometricSettings> {
  return {
    face: await readFlag(FACE_KEY),
    fingerprint: await readFlag(FINGERPRINT_KEY),
  };
}

export async function setBiometricEnabled(kind: BiometricKind, enabled: boolean): Promise<void> {
  const key = kind === 'face' ? FACE_KEY : FINGERPRINT_KEY;
  if (enabled) {
    await SecureStore.setItemAsync(key, '1');
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function authenticateBiometric(kind: BiometricKind): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: kind === 'face' ? 'Unlock with Face' : 'Unlock with fingerprint',
    cancelLabel: 'Cancel',
    disableDeviceFallback: true,
  });
  return result.success;
}

export async function enabledUnlockBiometrics(): Promise<BiometricSettings> {
  const available = await getBiometricAvailability();
  const settings = await getBiometricSettings();
  return {
    face: available.face && settings.face,
    fingerprint: available.fingerprint && settings.fingerprint,
  };
}
