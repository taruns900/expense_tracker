import { getDatabase, isDatabaseAvailable } from '@/database';
import {
  categoryRepository,
  enqueueSync,
  subCategoryRepository,
} from '@/database/repositories';
import type { SubCategoryRecord } from '@/types/masterData';
import { createId } from '@/utils/ids';
import { normalizeName, nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';

function requireDatabase(): void {
  if (!isDatabaseAvailable()) {
    throw new UserFacingError('This action is available on iOS and Android.');
  }
}

export const subCategoryService = {
  listByCategory: (categoryId: string) => subCategoryRepository.listByCategory(categoryId),
  listActiveByCategory: (categoryId: string) =>
    subCategoryRepository.listActiveByCategory(categoryId),

  async create(categoryId: string, rawName: string): Promise<SubCategoryRecord> {
    requireDatabase();
    const parent = await categoryRepository.getById(categoryId);
    if (!parent || !parent.isActive) {
      throw new UserFacingError('Please choose an active category first.');
    }
    const name = normalizeName(rawName);
    if (!name) {
      throw new UserFacingError('Please enter a subcategory name.');
    }
    const duplicate = await subCategoryRepository.findActiveByName(categoryId, name);
    if (duplicate) {
      throw new UserFacingError('A subcategory with this name already exists.');
    }

    const timestamp = nowIso();
    const record: Omit<SubCategoryRecord, 'categoryName'> = {
      id: createId(),
      categoryId,
      name,
      isActive: true,
      sortOrder: await subCategoryRepository.nextSortOrder(categoryId),
      syncStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await getDatabase().withTransactionAsync(async () => {
      await subCategoryRepository.insert(record);
      await enqueueSync({
        entityType: 'subcategory',
        entityId: record.id,
        operation: 'CREATE',
        payload: record,
      });
    });

    const saved = await subCategoryRepository.getById(record.id);
    if (!saved) {
      throw new UserFacingError("The subcategory couldn't be saved.");
    }
    return saved;
  },

  async rename(id: string, rawName: string): Promise<void> {
    requireDatabase();
    const current = await subCategoryRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That subcategory couldn't be found.");
    }
    const name = normalizeName(rawName);
    if (!name) {
      throw new UserFacingError('Please enter a subcategory name.');
    }
    const duplicate = await subCategoryRepository.findActiveByName(
      current.categoryId,
      name,
      id,
    );
    if (duplicate) {
      throw new UserFacingError('A subcategory with this name already exists.');
    }

    const updated = {
      ...current,
      name,
      syncStatus: 'PENDING' as const,
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await subCategoryRepository.update(updated);
      await enqueueSync({
        entityType: 'subcategory',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: updated,
      });
    });
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    requireDatabase();
    const current = await subCategoryRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That subcategory couldn't be found.");
    }
    if (isActive) {
      const duplicate = await subCategoryRepository.findActiveByName(
        current.categoryId,
        current.name,
        id,
      );
      if (duplicate) {
        throw new UserFacingError('A subcategory with this name already exists.');
      }
    }

    const updated = {
      ...current,
      isActive,
      syncStatus: 'PENDING' as const,
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await subCategoryRepository.update(updated);
      await enqueueSync({
        entityType: 'subcategory',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: updated,
      });
    });
  },
};
