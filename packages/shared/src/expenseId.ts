const pad = (value: number, length = 2): string =>
  String(value).padStart(length, '0');

/** User-visible expense ID: DDMMYY-HHMMSS */
export function formatExpenseId(date: Date): string {
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = pad(date.getFullYear() % 100);
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}${month}${year}-${hours}${minutes}${seconds}`;
}

export const EXPENSE_ID_PATTERN = /^\d{6}-\d{6}$/;

export function isExpenseId(value: string): boolean {
  return EXPENSE_ID_PATTERN.test(value);
}

export function bumpExpenseIdSeconds(expenseId: string): string {
  const match = expenseId.match(/^(\d{6})-(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    throw new Error('Invalid expense ID');
  }

  const [, datePart, hh, mm, ss] = match;
  const total = Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + 1;
  const wrapped = total % 86400;
  const nextH = pad(Math.floor(wrapped / 3600));
  const nextM = pad(Math.floor((wrapped % 3600) / 60));
  const nextS = pad(wrapped % 60);
  return `${datePart}-${nextH}${nextM}${nextS}`;
}
