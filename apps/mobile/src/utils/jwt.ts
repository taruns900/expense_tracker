export function decodeJwtPayload(token: string): { sub?: string; email?: string } | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    return JSON.parse(globalThis.atob(padded + pad)) as { sub?: string; email?: string };
  } catch {
    return null;
  }
}
