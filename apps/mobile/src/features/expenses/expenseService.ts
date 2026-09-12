import { bumpExpenseIdSeconds, computeGstAmount, DESCRIPTION_MAX_LENGTH, formatExpenseId, GST_RATES } from '@expense-tracker/shared';
import type { GstRate } from '@expense-tracker/shared';

import { getDatabase, isDatabaseAvailable } from '@/database';
import {
  categoryRepository,
  enqueueSync,
  expenseRepository,
  subCategoryRepository,
} from '@/database/repositories';
import type { ExpenseInput, ExpenseListItem, LocalExpense } from '@/types/expense';
import type { ExpenseFilters } from '@/types/filters';
import { toIsoDate } from '@/utils/dates';
import { createId } from '@/utils/ids';
import { nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';

function requireDatabase(): void {
  if (!isDatabaseAvailable()) {
    throw new UserFacingError('This action is available on iOS and Android.');
  }
}

function optional(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

async function nextExpenseId(): Promise<string> {
  let expenseId = formatExpenseId(new Date());
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (!(await expenseRepository.existsExpenseId(expenseId))) {
      return expenseId;
    }
    expenseId = bumpExpenseIdSeconds(expenseId);
  }
  throw new UserFacingError("Couldn't create an expense ID. Please try again.");
}

async function validateInput(input: ExpenseInput, existing?: LocalExpense): Promise<void> {
  if (!(input.amount > 0)) {
    throw new UserFacingError('Please enter an amount greater than 0.');
  }
  if (!input.paymentMethod) {
    throw new UserFacingError('Please select a payment method.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)) {
    throw new UserFacingError('Please choose a valid date.');
  }
  if (input.expenseDate > toIsoDate(new Date())) {
    throw new UserFacingError('Expense date cannot be in the future.');
  }
  if ((input.description?.trim().length ?? 0) > DESCRIPTION_MAX_LENGTH) {
    throw new UserFacingError(`Description can be at most ${DESCRIPTION_MAX_LENGTH} characters.`);
  }

  const category = await categoryRepository.getById(input.categoryId);
  if (!category) {
    throw new UserFacingError('Please select a category.');
  }
  if (!category.isActive && existing?.categoryId !== input.categoryId) {
    throw new UserFacingError('Please select an active category.');
  }

  if (input.subCategoryId) {
    const sub = await subCategoryRepository.getById(input.subCategoryId);
    if (!sub || sub.categoryId !== input.categoryId) {
      throw new UserFacingError('Please choose a subcategory that belongs to this category.');
    }
  }

  if (input.gstRate !== null && input.gstRate !== undefined) {
    if (!(GST_RATES as readonly number[]).includes(input.gstRate)) {
      throw new UserFacingError('Please choose a valid GST rate.');
    }
  }
}

function buildRecord(
  base: Pick<LocalExpense, 'id' | 'expenseId' | 'createdAt' | 'notes'>,
  input: ExpenseInput,
  timestamp: string,
): LocalExpense {
  const gstRate = input.gstRate ?? null;
  const gstAmount =
    gstRate === null
      ? null
      : (input.gstAmount ?? computeGstAmount(input.amount, gstRate as GstRate));

  return {
    id: base.id,
    expenseId: base.expenseId,
    expenseDate: input.expenseDate,
    categoryId: input.categoryId,
    subCategoryId: input.subCategoryId ?? null,
    amount: input.amount,
    description: optional(input.description),
    vendorId: input.vendorId ?? null,
    gstRate,
    gstAmount,
    paymentMethod: input.paymentMethod,
    billNumber: optional(input.billNumber),
    notes: base.notes,
    syncStatus: 'PENDING',
    createdAt: base.createdAt,
    updatedAt: timestamp,
  };
}

export const expenseService = {
  list: (filters?: ExpenseFilters, search?: string) =>
    expenseRepository.list(filters, search),
  getById: (id: string) => expenseRepository.getById(id),

  async create(input: ExpenseInput): Promise<ExpenseListItem> {
    requireDatabase();
    await validateInput(input);
    const timestamp = nowIso();
    const record = buildRecord(
      { id: createId(), expenseId: await nextExpenseId(), createdAt: timestamp, notes: null },
      input,
      timestamp,
    );

    await getDatabase().withTransactionAsync(async () => {
      await expenseRepository.insert(record);
      await enqueueSync({
        entityType: 'expense',
        entityId: record.id,
        operation: 'CREATE',
        payload: record,
      });
    });

    const saved = await expenseRepository.getById(record.id);
    if (!saved) {
      throw new UserFacingError("The expense couldn't be saved.");
    }
    return saved;
  },

  async update(id: string, input: ExpenseInput): Promise<ExpenseListItem> {
    requireDatabase();
    const existing = await expenseRepository.getById(id);
    if (!existing) {
      throw new UserFacingError("That expense couldn't be found.");
    }
    await validateInput(input, existing);
    const record = buildRecord(existing, input, nowIso());

    await getDatabase().withTransactionAsync(async () => {
      await expenseRepository.update(record);
      await enqueueSync({
        entityType: 'expense',
        entityId: record.id,
        operation: 'UPDATE',
        payload: record,
      });
    });

    const saved = await expenseRepository.getById(id);
    if (!saved) {
      throw new UserFacingError("The expense couldn't be updated.");
    }
    return saved;
  },

  async remove(id: string): Promise<void> {
    requireDatabase();
    const existing = await expenseRepository.getById(id);
    if (!existing) {
      throw new UserFacingError("That expense couldn't be found.");
    }
    const timestamp = nowIso();
    await getDatabase().withTransactionAsync(async () => {
      await expenseRepository.softDelete(id, timestamp);
      await enqueueSync({
        entityType: 'expense',
        entityId: id,
        operation: 'DELETE',
        payload: { id, updatedAt: timestamp },
      });
    });
  },
};
