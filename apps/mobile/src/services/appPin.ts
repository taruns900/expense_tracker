import * as SecureStore from 'expo-secure-store';

export const APP_PIN_KEY = 'et.pin';
const PIN_PROMPT_DISMISSED_KEY = 'et.pinPromptDismissed';

export function isValidAppPin(pin: string): boolean {
  return /^\d{4,}$/.test(pin);
}

export async function getAppPin(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(APP_PIN_KEY);
  } catch {
    return null;
  }
}

export async function setAppPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(APP_PIN_KEY, pin);
  await SecureStore.deleteItemAsync(PIN_PROMPT_DISMISSED_KEY);
}

export async function clearAppPin(): Promise<void> {
  await SecureStore.deleteItemAsync(APP_PIN_KEY);
}

export async function wasPinPromptDismissed(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(PIN_PROMPT_DISMISSED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function dismissPinPrompt(): Promise<void> {
  await SecureStore.setItemAsync(PIN_PROMPT_DISMISSED_KEY, '1');
}
