export function decodeJwtPayload(token: string): {
  sub?: string;
  phone?: string;
  name?: string;
  recoveryEmail?: string;
  email?: string;
  exp?: number;
} | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    return JSON.parse(globalThis.atob(padded + pad)) as {
      sub?: string;
      phone?: string;
      name?: string;
      recoveryEmail?: string;
      email?: string;
      exp?: number;
    };
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
