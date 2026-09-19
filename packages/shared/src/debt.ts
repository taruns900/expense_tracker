export const DEBT_DIRECTIONS = ['TAKEN', 'GIVEN'] as const;

export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export const DEBT_TAKEN_TRANSACTION_TYPES = ['BORROWED', 'REPAID'] as const;

export const DEBT_GIVEN_TRANSACTION_TYPES = ['GIVEN', 'RECEIVED'] as const;

export type DebtTakenTransactionType = (typeof DEBT_TAKEN_TRANSACTION_TYPES)[number];

export type DebtGivenTransactionType = (typeof DEBT_GIVEN_TRANSACTION_TYPES)[number];

export type DebtTransactionType = DebtTakenTransactionType | DebtGivenTransactionType;

export function transactionTypesForDirection(direction: DebtDirection): readonly DebtTransactionType[] {
  return direction === 'TAKEN' ? DEBT_TAKEN_TRANSACTION_TYPES : DEBT_GIVEN_TRANSACTION_TYPES;
}

export function isValidTransactionType(
  direction: DebtDirection,
  type: string,
): type is DebtTransactionType {
  return (transactionTypesForDirection(direction) as readonly string[]).includes(type);
}

export function debtTransactionDelta(direction: DebtDirection, type: DebtTransactionType): number {
  if (direction === 'TAKEN') {
    if (type === 'BORROWED') {
      return 1;
    }
    if (type === 'REPAID') {
      return -1;
    }
  } else {
    if (type === 'GIVEN') {
      return 1;
    }
    if (type === 'RECEIVED') {
      return -1;
    }
  }
  return 0;
}

export function calculateOutstanding(
  direction: DebtDirection,
  transactions: Array<{ type: DebtTransactionType; amount: number }>,
): number {
  let total = 0;
  for (const tx of transactions) {
    const sign = debtTransactionDelta(direction, tx.type);
    if (sign === 0) {
      continue;
    }
    total += sign * tx.amount;
  }
  return total;
}

export function formatDebtTransactionTypeLabel(
  direction: DebtDirection,
  type: DebtTransactionType,
): string {
  if (direction === 'TAKEN') {
    return type === 'BORROWED' ? 'Borrowed' : 'Repaid';
  }
  return type === 'GIVEN' ? 'Given' : 'Received';
}
