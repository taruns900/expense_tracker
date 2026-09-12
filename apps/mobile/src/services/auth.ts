import { apiRequest, clearTokens, setTokens } from '@/services/api';
import { UserFacingError } from '@/utils/userError';

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

export const authService = {
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
  },

  logout: () => clearTokens(),
};
