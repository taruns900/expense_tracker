import type { EntityType, SyncOperation, SyncStatus } from '@expense-tracker/shared';

import { createId } from '@/utils/ids';
import { nowIso } from '@/utils/text';

import { getDatabase, isDatabaseAvailable } from '../database';

export type SyncQueueRecord = {
  id: string;
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  payload: string;
  retryCount: number;
  status: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

type QueueItem = {
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
};

export async function enqueueSync(item: QueueItem): Promise<void> {
  const timestamp = nowIso();
  await getDatabase().runAsync(
    `INSERT INTO sync_queue (
      id, entity_type, entity_id, operation, payload, retry_count, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    createId(),
    item.entityType,
    item.entityId,
    item.operation,
    JSON.stringify(item.payload),
    'PENDING' satisfies SyncStatus,
    timestamp,
    timestamp,
  );
}

export async function listSyncQueue(): Promise<SyncQueueRecord[]> {
  if (!isDatabaseAvailable()) {
    return [];
  }
  const rows = await getDatabase().getAllAsync<{
    id: string;
    entity_type: EntityType;
    entity_id: string;
    operation: SyncOperation;
    payload: string;
    retry_count: number;
    status: SyncStatus;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, entity_type, entity_id, operation, payload, retry_count, status, created_at, updated_at
     FROM sync_queue
     ORDER BY created_at ASC`,
  );
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payload: row.payload,
    retryCount: row.retry_count,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function resetStuckSyncingItems(): Promise<void> {
  if (!isDatabaseAvailable()) {
    return;
  }
  const timestamp = nowIso();
  await getDatabase().runAsync(
    "UPDATE sync_queue SET status = 'PENDING', updated_at = ? WHERE status = 'SYNCING'",
    timestamp,
  );
}

export async function listDrainable(): Promise<SyncQueueRecord[]> {
  const items = await listSyncQueue();
  const rank: Record<string, number> = {
    category: 0,
    subcategory: 1,
    vendor: 2,
    business_profile: 3,
    expense: 4,
    attachment: 5,
  };
  return items
    .filter((item) => item.status === 'PENDING' || item.status === 'FAILED')
    .sort((a, b) => (rank[a.entityType] ?? 9) - (rank[b.entityType] ?? 9));
}

export async function updateQueueStatus(
  id: string,
  status: SyncStatus,
  retryCount?: number,
): Promise<void> {
  const timestamp = nowIso();
  if (retryCount === undefined) {
    await getDatabase().runAsync(
      'UPDATE sync_queue SET status = ?, updated_at = ? WHERE id = ?',
      status,
      timestamp,
      id,
    );
    return;
  }
  await getDatabase().runAsync(
    'UPDATE sync_queue SET status = ?, retry_count = ?, updated_at = ? WHERE id = ?',
    status,
    retryCount,
    timestamp,
    id,
  );
}

export async function queueCounts(): Promise<{
  pending: number;
  failed: number;
  synced: number;
}> {
  if (!isDatabaseAvailable()) {
    return { pending: 0, failed: 0, synced: 0 };
  }
  const row = await getDatabase().getFirstAsync<{
    pending: number;
    failed: number;
    synced: number;
  }>(
    `SELECT
      SUM(CASE WHEN status = 'PENDING' OR status = 'SYNCING' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'SYNCED' THEN 1 ELSE 0 END) as synced
     FROM sync_queue`,
  );
  return {
    pending: row?.pending ?? 0,
    failed: row?.failed ?? 0,
    synced: row?.synced ?? 0,
  };
}
