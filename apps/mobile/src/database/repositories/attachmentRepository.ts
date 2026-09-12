import type { SyncStatus } from '@expense-tracker/shared';

import { getDatabase, isDatabaseAvailable } from '../database';

export type AttachmentRecord = {
  id: string;
  expenseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  localFilePath: string;
  cloudObjectPath: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  expense_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  local_file_path: string;
  cloud_object_path: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): AttachmentRecord {
  return {
    id: row.id,
    expenseId: row.expense_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    localFilePath: row.local_file_path,
    cloudObjectPath: row.cloud_object_path,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const attachmentRepository = {
  async listByExpense(expenseId: string): Promise<AttachmentRecord[]> {
    if (!isDatabaseAvailable()) {
      return [];
    }
    const rows = await getDatabase().getAllAsync<Row>(
      `SELECT * FROM expense_attachments
       WHERE expense_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      expenseId,
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<AttachmentRecord | null> {
    if (!isDatabaseAvailable()) {
      return null;
    }
    const row = await getDatabase().getFirstAsync<Row>(
      'SELECT * FROM expense_attachments WHERE id = ? AND deleted_at IS NULL',
      id,
    );
    return row ? mapRow(row) : null;
  },

  async insert(record: AttachmentRecord): Promise<void> {
    await getDatabase().runAsync(
      `INSERT INTO expense_attachments (
        id, expense_id, file_name, file_type, file_size, local_file_path, cloud_object_path,
        sync_status, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      record.id,
      record.expenseId,
      record.fileName,
      record.fileType,
      record.fileSize,
      record.localFilePath,
      record.cloudObjectPath,
      record.syncStatus,
      record.createdAt,
      record.updatedAt,
    );
  },

  async updateCloudPath(id: string, cloudObjectPath: string, timestamp: string): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE expense_attachments
       SET cloud_object_path = ?, sync_status = 'SYNCED', updated_at = ?
       WHERE id = ?`,
      cloudObjectPath,
      timestamp,
      id,
    );
  },

  async softDelete(id: string, timestamp: string): Promise<void> {
    await getDatabase().runAsync(
      `UPDATE expense_attachments
       SET deleted_at = ?, sync_status = 'PENDING', updated_at = ?
       WHERE id = ?`,
      timestamp,
      timestamp,
      id,
    );
  },
};
