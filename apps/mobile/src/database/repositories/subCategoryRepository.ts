import type { SyncStatus } from '@expense-tracker/shared';

import type { SubCategoryRecord } from '@/types/masterData';

import { getDatabase, isDatabaseAvailable } from '../database';

type SubCategoryRow = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  is_active: number;
  sort_order: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function mapSubCategory(row: SubCategoryRow): SubCategoryRecord {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT
    s.id,
    s.category_id,
    c.name as category_name,
    s.name,
    s.is_active,
    s.sort_order,
    s.sync_status,
    s.created_at,
    s.updated_at
  FROM sub_categories s
  INNER JOIN categories c ON c.id = s.category_id
  WHERE s.deleted_at IS NULL
`;

export const subCategoryRepository = {
  async listByCategory(categoryId: string): Promise<SubCategoryRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<SubCategoryRow>(
      `${SELECT} AND s.category_id = ?
       ORDER BY s.is_active DESC, s.sort_order ASC, s.name COLLATE NOCASE ASC`,
      categoryId,
    );
    return rows.map(mapSubCategory);
  },

  async listActiveByCategory(categoryId: string): Promise<SubCategoryRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<SubCategoryRow>(
      `${SELECT} AND s.category_id = ? AND s.is_active = 1
       ORDER BY s.sort_order ASC, s.name COLLATE NOCASE ASC`,
      categoryId,
    );
    return rows.map(mapSubCategory);
  },

  async getById(id: string): Promise<SubCategoryRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<SubCategoryRow>(`${SELECT} AND s.id = ?`, id);
    return row ? mapSubCategory(row) : null;
  },

  async findActiveByName(
    categoryId: string,
    name: string,
    excludeId?: string,
  ): Promise<SubCategoryRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<SubCategoryRow>(
      `${SELECT} AND s.category_id = ? AND s.is_active = 1 AND s.name = ? COLLATE NOCASE AND s.id != ?`,
      categoryId,
      name,
      excludeId ?? '',
    );
    return row ? mapSubCategory(row) : null;
  },

  async insert(record: Omit<SubCategoryRecord, 'categoryName'>): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO sub_categories (
        id, category_id, name, is_active, sort_order, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      record.id,
      record.categoryId,
      record.name,
      record.isActive ? 1 : 0,
      record.sortOrder,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },

  async update(record: Omit<SubCategoryRecord, 'categoryName'>): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE sub_categories
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

  async nextSortOrder(categoryId: string): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 1;
    }
    const row = await getDatabase().getFirstAsync<{ value: number | null }>(
      `SELECT MAX(sort_order) as value FROM sub_categories
       WHERE deleted_at IS NULL AND category_id = ?`,
      categoryId,
    );
    return (row?.value ?? 0) + 1;
  },
};
