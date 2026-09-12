import { getDatabase, isDatabaseAvailable } from '@/database';
import { enqueueSync, vendorRepository } from '@/database/repositories';
import type { VendorRecord } from '@/types/masterData';
import { createId } from '@/utils/ids';
import { normalizeName, nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';

type VendorInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
};

function requireDatabase(): void {
  if (!isDatabaseAvailable()) {
    throw new UserFacingError('This action is available on iOS and Android.');
  }
}

function optionalText(value?: string): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

export const vendorService = {
  list: () => vendorRepository.list(),
  listActive: () => vendorRepository.listActive(),

  async create(input: VendorInput): Promise<VendorRecord> {
    requireDatabase();
    const name = normalizeName(input.name);
    if (!name) {
      throw new UserFacingError('Please enter a vendor name.');
    }
    const duplicate = await vendorRepository.findActiveByName(name);
    if (duplicate) {
      throw new UserFacingError('A vendor with this name already exists.');
    }

    const timestamp = nowIso();
    const record: VendorRecord = {
      id: createId(),
      name,
      email: optionalText(input.email),
      phone: optionalText(input.phone),
      address: optionalText(input.address),
      gstNumber: optionalText(input.gstNumber),
      isActive: true,
      syncStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await getDatabase().withTransactionAsync(async () => {
      await vendorRepository.insert(record);
      await enqueueSync({
        entityType: 'vendor',
        entityId: record.id,
        operation: 'CREATE',
        payload: record,
      });
    });

    return record;
  },

  async update(id: string, input: VendorInput): Promise<void> {
    requireDatabase();
    const current = await vendorRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That vendor couldn't be found.");
    }
    const name = normalizeName(input.name);
    if (!name) {
      throw new UserFacingError('Please enter a vendor name.');
    }
    const duplicate = await vendorRepository.findActiveByName(name, id);
    if (duplicate) {
      throw new UserFacingError('A vendor with this name already exists.');
    }

    const updated: VendorRecord = {
      ...current,
      name,
      email: optionalText(input.email),
      phone: optionalText(input.phone),
      address: optionalText(input.address),
      gstNumber: optionalText(input.gstNumber),
      syncStatus: 'PENDING',
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await vendorRepository.update(updated);
      await enqueueSync({
        entityType: 'vendor',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: updated,
      });
    });
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    requireDatabase();
    const current = await vendorRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That vendor couldn't be found.");
    }
    if (isActive) {
      const duplicate = await vendorRepository.findActiveByName(current.name, id);
      if (duplicate) {
        throw new UserFacingError('A vendor with this name already exists.');
      }
    }

    const updated: VendorRecord = {
      ...current,
      isActive,
      syncStatus: 'PENDING',
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await vendorRepository.update(updated);
      await enqueueSync({
        entityType: 'vendor',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: updated,
      });
    });
  },
};
