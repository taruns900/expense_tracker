import {
  APP_META_KEYS,
  deleteAppMeta,
  getAppMeta,
  resetLocalData,
  setAppMeta,
} from '@/database';
import { categoryRepository } from '@/database/repositories';
import { apiRequest, clearTokens, restoreAccessToken, setTokens } from '@/services/api';
import { syncEngine } from '@/services/sync';
import { useSessionStore } from '@/store';
import { decodeJwtPayload } from '@/utils/jwt';
import { isPhoneNumber, normalizePhone } from '@/utils/phone';
import { UserFacingError } from '@/utils/userError';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  phone: string;
  name: string;
  recoveryEmail: string;
};

function sessionFromTokens(tokens: AuthResponse, fallbackPhone: string, fallbackName = '', fallbackEmail = '') {
  const payload = decodeJwtPayload(tokens.accessToken);
  const userId = tokens.userId || payload?.sub;
  if (!userId) {
    throw new UserFacingError("Couldn't sign in. Please try again.");
  }
  return {
    userId,
    phone: tokens.phone || payload?.phone || fallbackPhone,
    name: tokens.name || payload?.name || fallbackName,
    recoveryEmail: tokens.recoveryEmail || payload?.recoveryEmail || payload?.email || fallbackEmail,
  };
}

async function bindAccount(session: {
  userId: string;
  phone: string;
  name: string;
  recoveryEmail: string;
}): Promise<void> {
  const storedUserId = await getAppMeta(APP_META_KEYS.cloudUserId);
  const rebind = (await getAppMeta(APP_META_KEYS.rebindFromCloud)) === '1';
  const replaceFromCloud = rebind || Boolean(storedUserId && storedUserId !== session.userId);

  if (replaceFromCloud) {
    await resetLocalData({ seed: false });
    await setAppMeta(APP_META_KEYS.syncSince, '');
  }

  await setAppMeta(APP_META_KEYS.cloudUserId, session.userId);
  await setAppMeta(APP_META_KEYS.rebindFromCloud, '0');
  useSessionStore.getState().setCloudSession(session);

  try {
    if (replaceFromCloud) {
      await syncEngine.pullFromCloud();
    }
    if ((await categoryRepository.count()) === 0) {
      const { seedMasterData } = await import('@/database/seed');
      await seedMasterData();
    }
    await syncEngine.run({ manual: true });
  } catch {
    // Signed in; Data Management can retry sync.
  }
  useSessionStore.getState().bumpDataEpoch();
}

export const authService = {
  async hydrate(): Promise<void> {
    const token = await restoreAccessToken();
    if (!token) {
      useSessionStore.getState().clearCloudSession();
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) {
      useSessionStore.getState().clearCloudSession();
      return;
    }
    useSessionStore.getState().setCloudSession({
      userId: payload.sub,
      phone: payload.phone ?? '',
      name: payload.name ?? '',
      recoveryEmail: payload.recoveryEmail ?? payload.email ?? '',
    });
  },

  async register(input: {
    name: string;
    phone: string;
    recoveryEmail: string;
    password: string;
  }): Promise<void> {
    const name = input.name.trim();
    const phone = normalizePhone(input.phone);
    const recoveryEmail = input.recoveryEmail.trim().toLowerCase();
    if (!name) {
      throw new UserFacingError('Enter your name.');
    }
    if (!isPhoneNumber(phone)) {
      throw new UserFacingError('Enter a valid phone number.');
    }
    if (!recoveryEmail.includes('@')) {
      throw new UserFacingError('Enter a recovery email.');
    }
    if (input.password.length < 8) {
      throw new UserFacingError('Use a password of at least 8 characters.');
    }
    const tokens = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      auth: false,
      body: { name, phone, recoveryEmail, password: input.password },
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    await bindAccount(sessionFromTokens(tokens, phone, name, recoveryEmail));
  },

  async login(phoneInput: string, password: string): Promise<void> {
    if (!phoneInput.trim() || !password) {
      throw new UserFacingError('Enter your phone number and password.');
    }
    const phone = phoneInput.includes('@') ? phoneInput.trim() : normalizePhone(phoneInput);
    const tokens = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { phone, password },
    });
    await setTokens(tokens.accessToken, tokens.refreshToken);
    await bindAccount(sessionFromTokens(tokens, phone));
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
