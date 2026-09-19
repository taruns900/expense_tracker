import { BUDGET_PERIOD_TYPES } from '@expense-tracker/shared';
import type { BudgetPeriodType } from '@expense-tracker/shared';

import { getDatabase, isDatabaseAvailable } from '@/database';
import {
  budgetRepository,
  categoryRepository,
  enqueueSync,
} from '@/database/repositories';
import { syncEngine } from '@/services/sync';
import type { BudgetInput, BudgetRecord } from '@/types/budget';
import { createId } from '@/utils/ids';
import { nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';

function requireDatabase(): void {
  if (!isDatabaseAvailable()) {
    throw new UserFacingError('This action is available on iOS and Android.');
  }
}

async function validateInput(input: BudgetInput, excludeId?: string): Promise<void> {
  if (!(input.amount > 0)) {
    throw new UserFacingError('Please enter an amount greater than 0.');
  }
  if (!BUDGET_PERIOD_TYPES.includes(input.periodType)) {
    throw new UserFacingError('Please choose a valid budget period.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(input.periodEnd)) {
    throw new UserFacingError('Please choose a valid period.');
  }
  if (input.periodStart > input.periodEnd) {
    throw new UserFacingError('The budget period is invalid.');
  }

  const category = await categoryRepository.getById(input.categoryId);
  if (!category) {
    throw new UserFacingError('Please select a category.');
  }

  const duplicate = await budgetRepository.findDuplicate(
    input.categoryId,
    input.periodStart,
    input.periodEnd,
    excludeId,
  );
  if (duplicate) {
    throw new UserFacingError('A budget already exists for this category and period.');
  }
}

function toPayload(record: BudgetRecord): Record<string, unknown> {
  return {
    id: record.id,
    categoryId: record.categoryId,
    periodType: record.periodType,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    amount: record.amount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const budgetService = {
  list: () => budgetRepository.list(),
  getById: (id: string) => budgetRepository.getById(id),

  async create(input: BudgetInput): Promise<BudgetRecord> {
    requireDatabase();
    await validateInput(input);
    const timestamp = nowIso();
    const record: BudgetRecord = {
      id: createId(),
      categoryId: input.categoryId,
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      amount: input.amount,
      syncStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await getDatabase().withTransactionAsync(async () => {
      await budgetRepository.insert(record);
      await enqueueSync({
        entityType: 'budget',
        entityId: record.id,
        operation: 'CREATE',
        payload: toPayload(record),
      });
    });
    syncEngine.request();
    return record;
  },

  async update(id: string, input: BudgetInput): Promise<void> {
    requireDatabase();
    const current = await budgetRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That budget couldn't be found.");
    }
    await validateInput(input, id);
    const updated: BudgetRecord = {
      ...current,
      categoryId: input.categoryId,
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      amount: input.amount,
      syncStatus: 'PENDING',
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await budgetRepository.update(updated);
      await enqueueSync({
        entityType: 'budget',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: toPayload(updated),
      });
    });
    syncEngine.request();
  },

  async remove(id: string): Promise<void> {
    requireDatabase();
    const current = await budgetRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That budget couldn't be found.");
    }
    const timestamp = nowIso();
    const payload = { ...toPayload(current), updatedAt: timestamp };

    await getDatabase().withTransactionAsync(async () => {
      await budgetRepository.softDelete(id, timestamp);
      await enqueueSync({
        entityType: 'budget',
        entityId: id,
        operation: 'DELETE',
        payload,
      });
    });
    syncEngine.request();
  },
};

export type { BudgetPeriodType };
