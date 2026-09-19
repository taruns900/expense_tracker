import type { DebtDirection, DebtTransactionType, SyncStatus } from '@expense-tracker/shared';

export type DebtPersonRecord = {
  id: string;
  name: string;
  mobileNumber: string;
  direction: DebtDirection;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type DebtTransactionRecord = {
  id: string;
  personId: string;
  type: DebtTransactionType;
  amount: number;
  transactionDate: string;
  note: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type DebtPersonListItem = DebtPersonRecord & {
  outstanding: number;
};

export type DebtPersonInput = {
  name: string;
  mobileNumber: string;
  direction: DebtDirection;
};

export type DebtTransactionInput = {
  personId: string;
  type: DebtTransactionType;
  amount: number;
  transactionDate: string;
  note?: string | null;
};
