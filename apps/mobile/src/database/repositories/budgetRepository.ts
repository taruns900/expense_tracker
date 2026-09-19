import { normalizeIsoDate, type BudgetPeriodType, type SyncStatus } from '@expense-tracker/shared';

import type { BudgetListItem, BudgetRecord } from '@/types/budget';

import { getDatabase, isDatabaseAvailable } from '../database';

type BudgetRow = {
  id: string;
  category_id: string;
  period_type: BudgetPeriodType;
  period_start: string;
  period_end: string;
  amount: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  category_name?: string;
};

function mapBudget(row: BudgetRow): BudgetRecord {
  return {
    id: row.id,
    categoryId: row.category_id,
    periodType: row.period_type,
    periodStart: normalizeIsoDate(row.period_start),
    periodEnd: normalizeIsoDate(row.period_end),
    amount: row.amount,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapListItem(row: BudgetRow): BudgetListItem {
  return {
    ...mapBudget(row),
    categoryName: row.category_name ?? '',
  };
}

export const budgetRepository = {
  async list(): Promise<BudgetListItem[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<BudgetRow>(
      `SELECT b.id, b.category_id, b.period_type, b.period_start, b.period_end, b.amount,
              b.sync_status, b.created_at, b.updated_at, c.name as category_name
       FROM budgets b
       INNER JOIN categories c ON c.id = b.category_id
       WHERE b.deleted_at IS NULL AND c.deleted_at IS NULL
       ORDER BY b.period_start DESC, c.name COLLATE NOCASE ASC`,
    );
    return rows.map(mapListItem);
  },

  async listActiveOnDate(isoDate: string): Promise<BudgetListItem[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<BudgetRow>(
      `SELECT b.id, b.category_id, b.period_type, b.period_start, b.period_end, b.amount,
              b.sync_status, b.created_at, b.updated_at, c.name as category_name
       FROM budgets b
       INNER JOIN categories c ON c.id = b.category_id
       WHERE b.deleted_at IS NULL AND c.deleted_at IS NULL
         AND b.period_start <= ? AND b.period_end >= ?
       ORDER BY c.name COLLATE NOCASE ASC, b.period_type ASC`,
      isoDate,
      isoDate,
    );
    return rows.map(mapListItem);
  },

  async getById(id: string): Promise<BudgetListItem | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<BudgetRow>(
      `SELECT b.id, b.category_id, b.period_type, b.period_start, b.period_end, b.amount,
              b.sync_status, b.created_at, b.updated_at, c.name as category_name
       FROM budgets b
       INNER JOIN categories c ON c.id = b.category_id
       WHERE b.id = ? AND b.deleted_at IS NULL`,
      id,
    );
    return row ? mapListItem(row) : null;
  },

  async findDuplicate(
    categoryId: string,
    periodStart: string,
    periodEnd: string,
    excludeId?: string,
  ): Promise<BudgetRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<BudgetRow>(
      `SELECT id, category_id, period_type, period_start, period_end, amount,
              sync_status, created_at, updated_at
       FROM budgets
       WHERE deleted_at IS NULL AND category_id = ? AND period_start = ? AND period_end = ?
         ${excludeId ? 'AND id != ?' : ''}
       LIMIT 1`,
      ...(excludeId
        ? [categoryId, periodStart, periodEnd, excludeId]
        : [categoryId, periodStart, periodEnd]),
    );
    return row ? mapBudget(row) : null;
  },

  async insert(record: BudgetRecord): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO budgets (
        id, category_id, period_type, period_start, period_end, amount,
        sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      record.id,
      record.categoryId,
      record.periodType,
      record.periodStart,
      record.periodEnd,
      record.amount,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },

  async update(record: BudgetRecord): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE budgets SET
        category_id = ?, period_type = ?, period_start = ?, period_end = ?, amount = ?,
        sync_status = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      record.categoryId,
      record.periodType,
      record.periodStart,
      record.periodEnd,
      record.amount,
      record.syncStatus,
      record.updatedAt,
      record.id,
    );
  },

  async softDelete(id: string, timestamp: string): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE budgets SET deleted_at = ?, sync_status = 'PENDING', updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      id,
    );
  },
};
