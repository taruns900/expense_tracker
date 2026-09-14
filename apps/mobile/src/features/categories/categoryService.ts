import { getDatabase, isDatabaseAvailable } from '@/database';
import {
  categoryRepository,
  enqueueSync,
} from '@/database/repositories';
import { syncEngine } from '@/services/sync';
import type { CategoryRecord } from '@/types/masterData';
import { createId } from '@/utils/ids';
import { normalizeName, nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';

function requireDatabase(): void {
  if (!isDatabaseAvailable()) {
    throw new UserFacingError('This action is available on iOS and Android.');
  }
}

async function requireUniqueName(name: string, excludeId?: string): Promise<void> {
  const existing = await categoryRepository.findActiveByName(name, excludeId);
  if (existing) {
    throw new UserFacingError('A category with this name already exists.');
  }
}

export const categoryService = {
  list: () => categoryRepository.list(),
  listActive: () => categoryRepository.listActive(),

  async create(rawName: string): Promise<CategoryRecord> {
    requireDatabase();
    const name = normalizeName(rawName);
    if (!name) {
      throw new UserFacingError('Please enter a category name.');
    }
    await requireUniqueName(name);

    const timestamp = nowIso();
    const record: CategoryRecord = {
      id: createId(),
      name,
      isActive: true,
      sortOrder: await categoryRepository.nextSortOrder(),
      syncStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await getDatabase().withTransactionAsync(async () => {
      await categoryRepository.insert(record);
      await enqueueSync({
        entityType: 'category',
        entityId: record.id,
        operation: 'CREATE',
        payload: record,
      });
    });

    syncEngine.request();
    return record;
  },

  async rename(id: string, rawName: string): Promise<void> {
    requireDatabase();
    const current = await categoryRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That category couldn't be found.");
    }
    const name = normalizeName(rawName);
    if (!name) {
      throw new UserFacingError('Please enter a category name.');
    }
    await requireUniqueName(name, id);

    const updated: CategoryRecord = {
      ...current,
      name,
      syncStatus: 'PENDING',
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await categoryRepository.update(updated);
      await enqueueSync({
        entityType: 'category',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: updated,
      });
    });
    syncEngine.request();
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    requireDatabase();
    const current = await categoryRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That category couldn't be found.");
    }
    if (isActive) {
      await requireUniqueName(current.name, id);
    }

    const updated: CategoryRecord = {
      ...current,
      isActive,
      syncStatus: 'PENDING',
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await categoryRepository.update(updated);
      await enqueueSync({
        entityType: 'category',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: updated,
      });
    });
    syncEngine.request();
  },
};
