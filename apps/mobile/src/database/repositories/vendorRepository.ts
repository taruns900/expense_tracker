import type { SyncStatus } from '@expense-tracker/shared';

import type { VendorRecord } from '@/types/masterData';

import { getDatabase, isDatabaseAvailable } from '../database';

type VendorRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  is_active: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function mapVendor(row: VendorRow): VendorRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    gstNumber: row.gst_number,
    isActive: row.is_active === 1,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const vendorRepository = {
  async count(): Promise<number> {
    if (!isDatabaseAvailable()) {
      return 0;
    }
    const row = await getDatabase().getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM vendors WHERE deleted_at IS NULL',
    );
    return row?.count ?? 0;
  },

  async list(): Promise<VendorRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<VendorRow>(
      `SELECT id, name, email, phone, address, gst_number, is_active, sync_status, created_at, updated_at
       FROM vendors
       WHERE deleted_at IS NULL
       ORDER BY is_active DESC, name COLLATE NOCASE ASC`,
    );
    return rows.map(mapVendor);
  },

  async listActive(): Promise<VendorRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<VendorRow>(
      `SELECT id, name, email, phone, address, gst_number, is_active, sync_status, created_at, updated_at
       FROM vendors
       WHERE deleted_at IS NULL AND is_active = 1
       ORDER BY name COLLATE NOCASE ASC`,
    );
    return rows.map(mapVendor);
  },

  async getById(id: string): Promise<VendorRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<VendorRow>(
      `SELECT id, name, email, phone, address, gst_number, is_active, sync_status, created_at, updated_at
       FROM vendors
       WHERE id = ? AND deleted_at IS NULL`,
      id,
    );
    return row ? mapVendor(row) : null;
  },

  async findActiveByName(name: string, excludeId?: string): Promise<VendorRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<VendorRow>(
      `SELECT id, name, email, phone, address, gst_number, is_active, sync_status, created_at, updated_at
       FROM vendors
       WHERE deleted_at IS NULL AND is_active = 1 AND name = ? COLLATE NOCASE AND id != ?`,
      name,
      excludeId ?? '',
    );
    return row ? mapVendor(row) : null;
  },

  async insert(record: VendorRecord): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO vendors (
        id, name, email, phone, address, gst_number, notes, is_active, sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)`,
      record.id,
      record.name,
      record.email,
      record.phone,
      record.address,
      record.gstNumber,
      record.isActive ? 1 : 0,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },

  async update(record: VendorRecord): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE vendors
       SET name = ?, email = ?, phone = ?, address = ?, gst_number = ?, is_active = ?, sync_status = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      record.name,
      record.email,
      record.phone,
      record.address,
      record.gstNumber,
      record.isActive ? 1 : 0,
      record.syncStatus,
      record.updatedAt,
      record.id,
    );
  },
};
