import type { GstRate, PaymentMethod, SyncStatus } from '@expense-tracker/shared';

import type { ExpenseListItem, LocalExpense } from '@/types/expense';
import type { ExpenseFilters } from '@/types/filters';

import { getDatabase, isDatabaseAvailable } from '../database';

type ExpenseRow = {
  id: string;
  expense_id: string;
  expense_date: string;
  category_id: string;
  sub_category_id: string | null;
  amount: number;
  description: string | null;
  vendor_id: string | null;
  gst_rate: number | null;
  gst_amount: number | null;
  payment_method: PaymentMethod;
  bill_number: string | null;
  notes: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  category_name?: string;
  subcategory_name?: string | null;
  vendor_name?: string | null;
};

function mapExpense(row: ExpenseRow): LocalExpense {
  return {
    id: row.id,
    expenseId: row.expense_id,
    expenseDate: row.expense_date,
    categoryId: row.category_id,
    subCategoryId: row.sub_category_id,
    amount: row.amount,
    description: row.description,
    vendorId: row.vendor_id,
    gstRate: (row.gst_rate as GstRate | null) ?? null,
    gstAmount: row.gst_amount,
    paymentMethod: row.payment_method,
    billNumber: row.bill_number,
    notes: row.notes,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapListItem(row: ExpenseRow): ExpenseListItem {
  return {
    ...mapExpense(row),
    categoryName: row.category_name ?? '',
    subCategoryName: row.subcategory_name ?? null,
    vendorName: row.vendor_name ?? null,
  };
}

const LIST_SELECT = `
  SELECT
    e.id, e.expense_id, e.expense_date, e.category_id, e.sub_category_id, e.amount,
    e.description, e.vendor_id, e.gst_rate, e.gst_amount, e.payment_method,
    e.bill_number, e.notes, e.sync_status, e.created_at, e.updated_at,
    c.name as category_name,
    s.name as subcategory_name,
    v.name as vendor_name
  FROM expenses e
  INNER JOIN categories c ON c.id = e.category_id
  LEFT JOIN sub_categories s ON s.id = e.sub_category_id
  LEFT JOIN vendors v ON v.id = e.vendor_id
`;

function buildFilterClause(
  filters: ExpenseFilters,
  search?: string,
): { sql: string; params: Array<string | number> } {
  const clauses = ['e.deleted_at IS NULL'];
  const params: Array<string | number> = [];

  if (filters.dateFrom) {
    clauses.push('e.expense_date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push('e.expense_date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.categoryId) {
    clauses.push('e.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.subCategoryId) {
    clauses.push('e.sub_category_id = ?');
    params.push(filters.subCategoryId);
  }
  if (filters.vendorId) {
    clauses.push('e.vendor_id = ?');
    params.push(filters.vendorId);
  }
  if (filters.paymentMethod) {
    clauses.push('e.payment_method = ?');
    params.push(filters.paymentMethod);
  }
  if (filters.amountMin !== undefined) {
    clauses.push('e.amount >= ?');
    params.push(filters.amountMin);
  }
  if (filters.amountMax !== undefined) {
    clauses.push('e.amount <= ?');
    params.push(filters.amountMax);
  }
  if (search?.trim()) {
    const like = `%${search.trim()}%`;
    clauses.push(`(
      e.expense_id LIKE ? OR
      IFNULL(e.description, '') LIKE ? OR
      IFNULL(e.bill_number, '') LIKE ? OR
      IFNULL(v.name, '') LIKE ? OR
      c.name LIKE ?
    )`);
    params.push(like, like, like, like, like);
  }

  return { sql: clauses.join(' AND '), params };
}

export const expenseRepository = {
  async count(): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 0;
    }
    const row = await getDatabase().getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM expenses WHERE deleted_at IS NULL',
    );
    return row?.count ?? 0;
  },

  async existsExpenseId(expenseId: string): Promise<boolean> {
    if (!isDatabaseAvailable()) {
      return false;
    }
    const row = await getDatabase().getFirstAsync<{ id: string }>(
      'SELECT id FROM expenses WHERE expense_id = ?',
      expenseId,
    );
    return Boolean(row);
  },

  async getById(id: string): Promise<ExpenseListItem | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<ExpenseRow>(
      `${LIST_SELECT} WHERE e.id = ? AND e.deleted_at IS NULL`,
      id,
    );
    return row ? mapListItem(row) : null;
  },

  async list(filters: ExpenseFilters = {}, search?: string): Promise<ExpenseListItem[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const { sql, params } = buildFilterClause(filters, search);
    const rows = await getDatabase().getAllAsync<ExpenseRow>(
      `${LIST_SELECT} WHERE ${sql} ORDER BY e.expense_date DESC, e.created_at DESC`,
      ...params,
    );
    return rows.map(mapListItem);
  },

  async insert(record: LocalExpense): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO expenses (
        id, expense_id, expense_date, category_id, sub_category_id, amount, description,
        vendor_id, gst_rate, gst_amount, payment_method, payment_status, bill_number, notes,
        sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      record.id,
      record.expenseId,
      record.expenseDate,
      record.categoryId,
      record.subCategoryId,
      record.amount,
      record.description,
      record.vendorId,
      record.gstRate,
      record.gstAmount,
      record.paymentMethod,
      'Paid',
      record.billNumber,
      record.notes,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },

  async update(record: LocalExpense): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE expenses SET
        expense_date = ?, category_id = ?, sub_category_id = ?, amount = ?, description = ?,
        vendor_id = ?, gst_rate = ?, gst_amount = ?, payment_method = ?,
        bill_number = ?, notes = ?, sync_status = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      record.expenseDate,
      record.categoryId,
      record.subCategoryId,
      record.amount,
      record.description,
      record.vendorId,
      record.gstRate,
      record.gstAmount,
      record.paymentMethod,
      record.billNumber,
      record.notes,
      record.syncStatus,
      record.updatedAt,
      record.id,
    );
  },

  async softDelete(id: string, timestamp: string): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE expenses
       SET deleted_at = ?, sync_status = 'PENDING', updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      id,
    );
  },

  async sumBetween(from: string, to: string): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 0;
    }
    const row = await getDatabase().getFirstAsync<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM expenses
       WHERE deleted_at IS NULL AND expense_date >= ? AND expense_date <= ?`,
      from,
      to,
    );
    return row?.total ?? 0;
  },

  async totalsByDate(from: string, to: string): Promise<Array<{ date: string; total: number }>> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    return getDatabase().getAllAsync(
      `SELECT expense_date as date, SUM(amount) as total
       FROM expenses
       WHERE deleted_at IS NULL AND expense_date >= ? AND expense_date <= ?
       GROUP BY expense_date`,
      from,
      to,
    );
  },

  async totalsByYearMonth(from: string, to: string): Promise<Array<{ yearMonth: string; total: number }>> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    return getDatabase().getAllAsync(
      `SELECT substr(expense_date, 1, 7) as yearMonth, SUM(amount) as total
       FROM expenses
       WHERE deleted_at IS NULL AND expense_date >= ? AND expense_date <= ?
       GROUP BY substr(expense_date, 1, 7)`,
      from,
      to,
    );
  },

  async topCategories(from: string, to: string): Promise<Array<{ name: string; total: number }>> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    return getDatabase().getAllAsync(
      `SELECT c.name as name, SUM(e.amount) as total
       FROM expenses e
       INNER JOIN categories c ON c.id = e.category_id
       WHERE e.deleted_at IS NULL AND e.expense_date >= ? AND e.expense_date <= ?
       GROUP BY e.category_id
       ORDER BY total DESC
       LIMIT 5`,
      from,
      to,
    );
  },
};
