import type { BudgetPeriodType, SyncStatus } from '@expense-tracker/shared';

export type BudgetRecord = {
  id: string;
  categoryId: string;
  periodType: BudgetPeriodType;
  periodStart: string;
  periodEnd: string;
  amount: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type BudgetListItem = BudgetRecord & {
  categoryName: string;
};

export type BudgetInput = {
  categoryId: string;
  periodType: BudgetPeriodType;
  periodStart: string;
  periodEnd: string;
  amount: number;
};
