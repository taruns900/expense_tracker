import type { SyncStatus } from '@expense-tracker/shared';

import type { CategoryRecord } from '@/types/masterData';

import { getDatabase, isDatabaseAvailable } from '../database';

type CategoryRow = {
  id: string;
  name: string;
  is_active: number;
  sort_order: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function mapCategory(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const categoryRepository = {
  async count(): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 0;
    }
    const row = await getDatabase().getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories WHERE deleted_at IS NULL',
    );
    return row?.count ?? 0;
  },

  async list(): Promise<CategoryRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<CategoryRow>(
      `SELECT id, name, is_active, sort_order, sync_status, created_at, updated_at
       FROM categories
       WHERE deleted_at IS NULL
       ORDER BY is_active DESC, sort_order ASC, name COLLATE NOCASE ASC`,
    );
    return rows.map(mapCategory);
  },

  async listActive(): Promise<CategoryRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<CategoryRow>(
      `SELECT id, name, is_active, sort_order, sync_status, created_at, updated_at
       FROM categories
       WHERE deleted_at IS NULL AND is_active = 1
       ORDER BY sort_order ASC, name COLLATE NOCASE ASC`,
    );
    return rows.map(mapCategory);
  },

  async getById(id: string): Promise<CategoryRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<CategoryRow>(
      `SELECT id, name, is_active, sort_order, sync_status, created_at, updated_at
       FROM categories
       WHERE id = ? AND deleted_at IS NULL`,
      id,
    );
    return row ? mapCategory(row) : null;
  },

  async findActiveByName(name: string, excludeId?: string): Promise<CategoryRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<CategoryRow>(
      `SELECT id, name, is_active, sort_order, sync_status, created_at, updated_at
       FROM categories
       WHERE deleted_at IS NULL AND is_active = 1 AND name = ? COLLATE NOCASE
         AND id != ?`,
      name,
      excludeId ?? '',
    );
    return row ? mapCategory(row) : null;
  },

  async insert(record: CategoryRecord): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO categories (
        id, name, is_active, sort_order, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      record.id,
      record.name,
      record.isActive ? 1 : 0,
      record.sortOrder,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },

  async update(record: CategoryRecord): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE categories
       SET name = ?, is_active = ?, sort_order = ?, sync_status = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      record.name,
      record.isActive ? 1 : 0,
      record.sortOrder,
      record.syncStatus,
      record.updatedAt,
      record.id,
    );
  },

  async nextSortOrder(): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 1;
    }
    const row = await getDatabase().getFirstAsync<{ value: number | null }>(
      'SELECT MAX(sort_order) as value FROM categories WHERE deleted_at IS NULL',
    );
    return (row?.value ?? 0) + 1;
  },
};
