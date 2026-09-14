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

export async function enqueueMissingLocalChanges(): Promise<void> {
  if (!isDatabaseAvailable()) {
    return;
  }
  const open = new Set(
    (await listSyncQueue())
      .filter((item) => item.status !== 'SYNCED')
      .map((item) => `${item.entityType}:${item.entityId}`),
  );

  const categories = await getDatabase().getAllAsync<{
    id: string;
    name: string;
    is_active: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, name, is_active, sort_order, created_at, updated_at
     FROM categories
     WHERE deleted_at IS NULL AND sync_status != 'SYNCED'`,
  );
  for (const row of categories) {
    if (open.has(`category:${row.id}`)) {
      continue;
    }
    await enqueueSync({
      entityType: 'category',
      entityId: row.id,
      operation: 'UPDATE',
      payload: {
        id: row.id,
        name: row.name,
        isActive: row.is_active === 1,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
    open.add(`category:${row.id}`);
  }

  const subcategories = await getDatabase().getAllAsync<{
    id: string;
    category_id: string;
    name: string;
    is_active: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, category_id, name, is_active, sort_order, created_at, updated_at
     FROM sub_categories
     WHERE deleted_at IS NULL AND sync_status != 'SYNCED'`,
  );
  for (const row of subcategories) {
    if (open.has(`subcategory:${row.id}`)) {
      continue;
    }
    await enqueueSync({
      entityType: 'subcategory',
      entityId: row.id,
      operation: 'UPDATE',
      payload: {
        id: row.id,
        categoryId: row.category_id,
        name: row.name,
        isActive: row.is_active === 1,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
    open.add(`subcategory:${row.id}`);
  }

  const expenses = await getDatabase().getAllAsync<{
    id: string;
    expense_id: string;
    expense_date: string;
    category_id: string;
    sub_category_id: string | null;
    amount: number;
    description: string | null;
    gst_rate: number | null;
    gst_amount: number | null;
    payment_method: string;
    bill_number: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>(
    `SELECT id, expense_id, expense_date, category_id, sub_category_id, amount, description,
            gst_rate, gst_amount, payment_method, bill_number, notes, created_at, updated_at, deleted_at
     FROM expenses
     WHERE sync_status != 'SYNCED'`,
  );
  for (const row of expenses) {
    if (open.has(`expense:${row.id}`)) {
      continue;
    }
    await enqueueSync({
      entityType: 'expense',
      entityId: row.id,
      operation: row.deleted_at ? 'DELETE' : 'UPDATE',
      payload: {
        id: row.id,
        expenseId: row.expense_id,
        expenseDate: row.expense_date,
        categoryId: row.category_id,
        subCategoryId: row.sub_category_id,
        amount: row.amount,
        description: row.description,
        gstRate: row.gst_rate,
        gstAmount: row.gst_amount,
        paymentMethod: row.payment_method,
        billNumber: row.bill_number,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  }
}

export async function markEntitySynced(entityType: string, entityId: string): Promise<void> {
  if (!isDatabaseAvailable()) {
    return;
  }
  if (entityType === 'category') {
    await getDatabase().runAsync("UPDATE categories SET sync_status = 'SYNCED' WHERE id = ?", entityId);
    return;
  }
  if (entityType === 'subcategory') {
    await getDatabase().runAsync(
      "UPDATE sub_categories SET sync_status = 'SYNCED' WHERE id = ?",
      entityId,
    );
    return;
  }
  if (entityType === 'expense') {
    await getDatabase().runAsync("UPDATE expenses SET sync_status = 'SYNCED' WHERE id = ?", entityId);
  }
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
