export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
