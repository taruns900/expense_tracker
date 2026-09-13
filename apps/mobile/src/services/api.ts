import * as SecureStore from 'expo-secure-store';

import { config } from '@/config/env';
import { UserFacingError } from '@/utils/userError';

const ACCESS_KEY = 'et.accessToken';
const REFRESH_KEY = 'et.refreshToken';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_KEY);
  } catch {
    return null;
  }
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Internal: avoid infinite refresh loops. */
  retried?: boolean;
};

async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) {
      return false;
    }
    const tokens = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!tokens.ok) {
      return false;
    }
    const payload = (await tokens.json()) as AuthResponse;
    await setTokens(payload.accessToken, payload.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new UserFacingError('Some changes couldn’t be synced. We’ll try again automatically.');
  }

  if (response.status === 401 && options.auth !== false && !options.retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retried: true });
    }
    throw new UserFacingError('Sign in again under Settings to sync with the cloud.');
  }

  if (!response.ok) {
    let serverMessage: string | null = null;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (typeof payload.message === 'string') {
        serverMessage = payload.message;
      } else if (Array.isArray(payload.message) && typeof payload.message[0] === 'string') {
        serverMessage = payload.message[0];
      }
    } catch {
      serverMessage = null;
    }
    if (options.auth === false && serverMessage) {
      throw new UserFacingError(serverMessage);
    }
    throw new UserFacingError(
      serverMessage && response.status === 403
        ? serverMessage
        : 'Some changes couldn’t be synced. We’ll try again automatically.',
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
