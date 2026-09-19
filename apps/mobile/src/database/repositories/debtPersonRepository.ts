import type { DebtDirection, SyncStatus } from '@expense-tracker/shared';

import type { DebtPersonRecord } from '@/types/debt';

import { getDatabase, isDatabaseAvailable } from '../database';

type PersonRow = {
  id: string;
  name: string;
  mobile_number: string;
  direction: DebtDirection;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function mapPerson(row: PersonRow): DebtPersonRecord {
  return {
    id: row.id,
    name: row.name,
    mobileNumber: row.mobile_number,
    direction: row.direction,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const debtPersonRepository = {
  async list(): Promise<DebtPersonRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<PersonRow>(
      `SELECT id, name, mobile_number, direction, sync_status, created_at, updated_at
       FROM debt_people
       WHERE deleted_at IS NULL
       ORDER BY name COLLATE NOCASE ASC`,
    );
    return rows.map(mapPerson);
  },

  async getById(id: string): Promise<DebtPersonRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<PersonRow>(
      `SELECT id, name, mobile_number, direction, sync_status, created_at, updated_at
       FROM debt_people WHERE id = ? AND deleted_at IS NULL`,
      id,
    );
    return row ? mapPerson(row) : null;
  },

  async findByMobile(mobileNumber: string, excludeId?: string): Promise<DebtPersonRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<PersonRow>(
      `SELECT id, name, mobile_number, direction, sync_status, created_at, updated_at
       FROM debt_people
       WHERE deleted_at IS NULL AND mobile_number = ?
         ${excludeId ? 'AND id != ?' : ''}
       LIMIT 1`,
      ...(excludeId ? [mobileNumber, excludeId] : [mobileNumber]),
    );
    return row ? mapPerson(row) : null;
  },

  async insert(record: DebtPersonRecord): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO debt_people (
        id, name, mobile_number, direction, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      record.id,
      record.name,
      record.mobileNumber,
      record.direction,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },

  async update(record: DebtPersonRecord): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE debt_people SET
        name = ?, mobile_number = ?, direction = ?, sync_status = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      record.name,
      record.mobileNumber,
      record.direction,
      record.syncStatus,
      record.updatedAt,
      record.id,
    );
  },

  async softDelete(id: string, timestamp: string): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE debt_people SET deleted_at = ?, sync_status = 'PENDING', updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      id,
    );
  },
};
