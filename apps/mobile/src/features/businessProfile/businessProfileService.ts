import { getDatabase, isDatabaseAvailable } from '@/database';
import { businessProfileRepository } from '@/database/repositories';
import type { BusinessProfileRecord } from '@/database/repositories/businessProfileRepository';
import { nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';

export type BusinessProfileInput = {
  businessName: string;
  address?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
};

function optional(value?: string): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export const businessProfileService = {
  get: () => businessProfileRepository.get(),

  async save(input: BusinessProfileInput): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new UserFacingError('This action is available on iOS and Android.');
    }
    const existing = await businessProfileRepository.get();
    const timestamp = nowIso();
    const record: BusinessProfileRecord = {
      id: businessProfileRepository.profileId,
      businessName: optional(input.businessName),
      address: optional(input.address),
      phone: optional(input.phone),
      email: optional(input.email),
      gstNumber: optional(input.gstNumber),
      logoLocalPath: existing?.logoLocalPath ?? null,
      syncStatus: 'PENDING',
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await getDatabase().withTransactionAsync(async () => {
      await businessProfileRepository.upsert(record);
      // Later version — business profile cloud sync
      // await enqueueSync({
      //   entityType: 'business_profile',
      //   entityId: record.id,
      //   operation: existing ? 'UPDATE' : 'CREATE',
      //   payload: record,
      // });
    });
  },
};
