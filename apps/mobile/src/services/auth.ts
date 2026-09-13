import {
  APP_META_KEYS,
  deleteAppMeta,
  getAppMeta,
  resetLocalData,
  setAppMeta,
} from '@/database';
import { categoryRepository } from '@/database/repositories';
import { apiRequest, clearTokens, getAccessToken, setTokens } from '@/services/api';
import { syncEngine } from '@/services/sync';
import { useSessionStore } from '@/store';
import { decodeJwtPayload } from '@/utils/jwt';
import { UserFacingError } from '@/utils/userError';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
};

async function bindAccount(userId: string, email: string): Promise<void> {
  const storedUserId = await getAppMeta(APP_META_KEYS.cloudUserId);
  const rebind = (await getAppMeta(APP_META_KEYS.rebindFromCloud)) === '1';
  const replaceFromCloud = rebind || Boolean(storedUserId && storedUserId !== userId);

  if (replaceFromCloud) {
    await resetLocalData({ seed: false });
    await setAppMeta(APP_META_KEYS.syncSince, '');
  }

  await setAppMeta(APP_META_KEYS.cloudUserId, userId);
  await setAppMeta(APP_META_KEYS.rebindFromCloud, '0');
  useSessionStore.getState().setCloudSession(userId, email);

  try {
    if (replaceFromCloud) {
      await syncEngine.pullFromCloud();
      if ((await categoryRepository.count()) === 0) {
        const { seedMasterData } = await import('@/database/seed');
        await seedMasterData();
      }
    }
    await syncEngine.run({ manual: true });
  } catch {
    // Signed in; Data Management can retry sync.
  }
  useSessionStore.getState().bumpDataEpoch();
}

export const authService = {
  async hydrate(): Promise<void> {
    const token = await getAccessToken();
    if (!token) {
      useSessionStore.getState().clearCloudSession();
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) {
      useSessionStore.getState().clearCloudSession();
      return;
    }
    useSessionStore.getState().setCloudSession(payload.sub, payload.email ?? '');
  },

  async register(email: string, password: string): Promise<void> {
    if (!email.trim() || password.length < 8) {
      throw new UserFacingError('Enter an email and a password of at least 8 characters.');
    }
    const tokens = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      auth: false,
      body: { email: email.trim(), password },
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    const userId = tokens.userId || decodeJwtPayload(tokens.accessToken)?.sub;
    const accountEmail = tokens.email || email.trim().toLowerCase();
    if (!userId) {
      throw new UserFacingError("Couldn't sign in. Please try again.");
    }
    await bindAccount(userId, accountEmail);
  },

  async login(email: string, password: string): Promise<void> {
    if (!email.trim() || !password) {
      throw new UserFacingError('Enter your email and password.');
    }
    const tokens = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: email.trim(), password },
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    const userId = tokens.userId || decodeJwtPayload(tokens.accessToken)?.sub;
    const accountEmail = tokens.email || email.trim().toLowerCase();
    if (!userId) {
      throw new UserFacingError("Couldn't sign in. Please try again.");
    }
    await bindAccount(userId, accountEmail);
  },

  async logout(): Promise<void> {
    await clearTokens();
    await resetLocalData({ seed: true });
    await setAppMeta(APP_META_KEYS.rebindFromCloud, '1');
    await deleteAppMeta(APP_META_KEYS.cloudUserId);
    useSessionStore.getState().clearCloudSession();
    useSessionStore.getState().bumpDataEpoch();
  },
};
