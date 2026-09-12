import { DEFAULT_CATEGORIES } from '@expense-tracker/shared';

import { nowIso } from '@/utils/text';

import { getDatabase } from './database';
import { enqueueSync } from './repositories/syncQueueRepository';

const SEED_KEY = 'master_data_seed_version';
const SEED_VERSION = '1';

export async function seedMasterData(): Promise<void> {
  const db = getDatabase();
  const existing = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    SEED_KEY,
  );
  if (existing?.value === SEED_VERSION) {
    return;
  }

  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    for (const category of DEFAULT_CATEGORIES) {
      const categoryInsert = await db.runAsync(
        `INSERT OR IGNORE INTO categories (
          id, name, is_active, sort_order, sync_status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, 1, ?, 'PENDING', ?, ?, NULL)`,
        category.id,
        category.name,
        category.sortOrder,
        timestamp,
        timestamp,
      );
      if (categoryInsert.changes > 0) {
        await enqueueSync({
          entityType: 'category',
          entityId: category.id,
          operation: 'CREATE',
          payload: {
            id: category.id,
            name: category.name,
            isActive: true,
            sortOrder: category.sortOrder,
          },
        });
      }

      for (const [index, subcategory] of category.subcategories.entries()) {
        const subcategoryInsert = await db.runAsync(
          `INSERT OR IGNORE INTO sub_categories (
            id, category_id, name, is_active, sort_order, sync_status, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, 1, ?, 'PENDING', ?, ?, NULL)`,
          subcategory.id,
          category.id,
          subcategory.name,
          index + 1,
          timestamp,
          timestamp,
        );
        if (subcategoryInsert.changes > 0) {
          await enqueueSync({
            entityType: 'subcategory',
            entityId: subcategory.id,
            operation: 'CREATE',
            payload: {
              id: subcategory.id,
              categoryId: category.id,
              name: subcategory.name,
              isActive: true,
              sortOrder: index + 1,
            },
          });
        }
      }
    }

    await db.runAsync(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      SEED_KEY,
      SEED_VERSION,
    );
  });
}
