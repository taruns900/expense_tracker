import type { PaymentMethod } from '@expense-tracker/shared';

export type ExpenseFilters = {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  subCategoryId?: string;
  vendorId?: string;
  paymentMethod?: PaymentMethod;
  amountMin?: number;
  amountMax?: number;
};

export function hasActiveFilters(filters: ExpenseFilters): boolean {
  return Object.values(filters).some((value) => value !== undefined && value !== '');
}
