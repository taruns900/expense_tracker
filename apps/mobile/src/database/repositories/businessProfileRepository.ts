import type { SyncStatus } from '@expense-tracker/shared';

import { getDatabase, isDatabaseAvailable } from '../database';

export type BusinessProfileRecord = {
  id: string;
  businessName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  logoLocalPath: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

const PROFILE_ID = 'local-business';

type Row = {
  id: string;
  business_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
  logo_local_path: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): BusinessProfileRecord {
  return {
    id: row.id,
    businessName: row.business_name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    gstNumber: row.gst_number,
    logoLocalPath: row.logo_local_path,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const businessProfileRepository = {
  profileId: PROFILE_ID,

  async get(): Promise<BusinessProfileRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<Row>(
      'SELECT * FROM business_profile WHERE id = ?',
      PROFILE_ID,
    );
    return row ? mapRow(row) : null;
  },

  async upsert(record: BusinessProfileRecord): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO business_profile (
        id, business_name, address, phone, email, gst_number, logo_local_path, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        business_name = excluded.business_name,
        address = excluded.address,
        phone = excluded.phone,
        email = excluded.email,
        gst_number = excluded.gst_number,
        logo_local_path = excluded.logo_local_path,
        sync_status = excluded.sync_status,
        updated_at = excluded.updated_at`,
      record.id,
      record.businessName,
      record.address,
      record.phone,
      record.email,
      record.gstNumber,
      record.logoLocalPath,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },
};
