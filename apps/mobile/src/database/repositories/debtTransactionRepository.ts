import type { DebtTransactionType, SyncStatus } from '@expense-tracker/shared';

import type { DebtTransactionRecord } from '@/types/debt';

import { getDatabase, isDatabaseAvailable } from '../database';

type TransactionRow = {
  id: string;
  person_id: string;
  type: DebtTransactionType;
  amount: number;
  transaction_date: string;
  note: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function mapTransaction(row: TransactionRow): DebtTransactionRecord {
  return {
    id: row.id,
    personId: row.person_id,
    type: row.type,
    amount: row.amount,
    transactionDate: row.transaction_date,
    note: row.note,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const debtTransactionRepository = {
  async listForPerson(personId: string): Promise<DebtTransactionRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<TransactionRow>(
      `SELECT id, person_id, type, amount, transaction_date, note, sync_status, created_at, updated_at
       FROM debt_transactions
       WHERE person_id = ? AND deleted_at IS NULL
       ORDER BY transaction_date DESC, created_at DESC`,
      personId,
    );
    return rows.map(mapTransaction);
  },

  async listAllForPeople(personIds: string[]): Promise<DebtTransactionRecord[]> {
    if (!isDatabaseAvailable() || personIds.length === 0) {
      return [];
    }
    const placeholders = personIds.map(() => '?').join(', ');
    const rows = await getDatabase().getAllAsync<TransactionRow>(
      `SELECT id, person_id, type, amount, transaction_date, note, sync_status, created_at, updated_at
       FROM debt_transactions
       WHERE deleted_at IS NULL AND person_id IN (${placeholders})`,
      ...personIds,
    );
    return rows.map(mapTransaction);
  },

  async getById(id: string): Promise<DebtTransactionRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<TransactionRow>(
      `SELECT id, person_id, type, amount, transaction_date, note, sync_status, created_at, updated_at
       FROM debt_transactions WHERE id = ? AND deleted_at IS NULL`,
      id,
    );
    return row ? mapTransaction(row) : null;
  },

  async insert(record: DebtTransactionRecord): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO debt_transactions (
        id, person_id, type, amount, transaction_date, note,
        sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      record.id,
      record.personId,
      record.type,
      record.amount,
      record.transactionDate,
      record.note,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },

  async update(record: DebtTransactionRecord): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE debt_transactions SET
        type = ?, amount = ?, transaction_date = ?, note = ?, sync_status = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      record.type,
      record.amount,
      record.transactionDate,
      record.note,
      record.syncStatus,
      record.updatedAt,
      record.id,
    );
  },

  async softDelete(id: string, timestamp: string): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE debt_transactions SET deleted_at = ?, sync_status = 'PENDING', updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      id,
    );
  },
};
