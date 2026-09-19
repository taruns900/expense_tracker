import type { PaymentMethod, SyncStatus } from '@expense-tracker/shared';

export type LocalExpense = {
  id: string;
  expenseId: string;
  expenseDate: string;
  categoryId: string;
  subCategoryId: string | null;
  amount: number;
  description: string | null;
  vendorId: string | null;
  gstRate: number | null;
  gstAmount: number | null;
  paymentMethod: PaymentMethod;
  billNumber: string | null;
  notes: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseListItem = LocalExpense & {
  categoryName: string;
  subCategoryName: string | null;
  vendorName: string | null;
};

export type ExpenseInput = {
  amount: number;
  expenseDate: string;
  categoryId: string;
  subCategoryId?: string | null;
  paymentMethod: PaymentMethod;
  description?: string | null;
  vendorId?: string | null;
  gstRate?: number | null;
  gstAmount?: number | null;
  billNumber?: string | null;
};
