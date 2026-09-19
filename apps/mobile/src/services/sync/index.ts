import * as Network from 'expo-network';

import { APP_META_KEYS, getAppMeta, getDatabase, isDatabaseAvailable, setAppMeta } from '@/database';
import {
  budgetRepository,
  categoryRepository,
  debtPersonRepository,
  debtTransactionRepository,
  enqueueMissingLocalChanges,
  expenseRepository,
  listDrainable,
  markEntitySynced,
  queueCounts,
  resetStuckSyncingItems,
  subCategoryRepository,
  updateQueueStatus,
} from '@/database/repositories';
import type { SyncQueueRecord } from '@/database/repositories/syncQueueRepository';
import { apiRequest, getAccessToken } from '@/services/api';
import type { LocalExpense } from '@/types/expense';
import { nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';
import type { PaymentMethod } from '@expense-tracker/shared';

type SyncChange = {
  entityType: string;
  entityId: string;
  operation: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

type SyncRunOptions = {
  /** When true, surface errors instead of failing silently (manual sync button). */
  manual?: boolean;
};

const SYNC_FAILURE_MESSAGE =
  'Some changes couldn’t be synced. We’ll try again automatically.';

const CLOUD_ENTITY_TYPES = new Set([
  'category',
  'subcategory',
  'expense',
  'budget',
  'debt_person',
  'debt_transaction',
]);

const APPLY_ORDER: Record<string, number> = {
  category: 0,
  subcategory: 1,
  expense: 2,
  budget: 3,
  debt_person: 4,
  debt_transaction: 5,
};

function parsePayload(item: SyncQueueRecord): Record<string, unknown> {
  try {
    return JSON.parse(item.payload) as Record<string, unknown>;
  } catch {
    return { id: item.entityId };
  }
}

function requireManualPreconditions(options?: SyncRunOptions): void {
  if (!options?.manual) {
    return;
  }
  if (!isDatabaseAvailable()) {
    throw new UserFacingError('This action is available on iOS and Android.');
  }
}

function assertManualSyncReady(online: boolean, hasToken: boolean, options?: SyncRunOptions): void {
  if (!options?.manual) {
    return;
  }
  if (!online) {
    throw new UserFacingError('Connect to the internet to sync.');
  }
  if (!hasToken) {
    throw new UserFacingError('Sign in to sync with the cloud.');
  }
}

async function pullChanges(): Promise<void> {
  const since = await getAppMeta(APP_META_KEYS.syncSince);
  const result = await apiRequest<{ changes: SyncChange[]; cursor: string }>(
    `/sync/changes?since=${encodeURIComponent(since ?? '')}`,
  );
  const ordered = [...result.changes].sort(
    (a, b) => (APPLY_ORDER[a.entityType] ?? 9) - (APPLY_ORDER[b.entityType] ?? 9),
  );
  for (const change of ordered) {
    await applyRemoteChange(change);
  }
  await setAppMeta(APP_META_KEYS.syncSince, result.cursor);
}

function isOnlineState(state: Network.NetworkState): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

let runChain: Promise<void> = Promise.resolve();
let networkSubscription: { remove: () => void } | null = null;
let lastOnline: boolean | null = null;

async function runOnce(options?: SyncRunOptions): Promise<void> {
  requireManualPreconditions(options);

  if (!isDatabaseAvailable()) {
    return;
  }

  await resetStuckSyncingItems();
  await enqueueMissingLocalChanges();

  const online = await syncEngine.isOnline();
  const hasToken = Boolean(await getAccessToken());
  if (!online || !hasToken) {
    assertManualSyncReady(online, hasToken, options);
    return;
  }

  const queued = await listDrainable();
  const parked = queued.filter((item) => !CLOUD_ENTITY_TYPES.has(item.entityType));
  for (const item of parked) {
    await updateQueueStatus(item.id, 'SYNCED');
  }

  const items = queued.filter((item) => CLOUD_ENTITY_TYPES.has(item.entityType));
  if (items.length > 0) {
    const changes: SyncChange[] = items.map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      updatedAt: item.updatedAt,
      data: parsePayload(item),
    }));

    for (const item of items) {
      await updateQueueStatus(item.id, 'SYNCING');
    }

    let result: {
      accepted?: number;
      failed?: Array<{ entityId: string; entityType: string }>;
    };
    try {
      result = await apiRequest<{
        accepted?: number;
        failed?: Array<{ entityId: string; entityType: string }>;
      }>('/sync', { method: 'POST', body: { changes } });
    } catch (error) {
      for (const item of items) {
        await updateQueueStatus(item.id, 'FAILED', item.retryCount + 1);
      }
      if (options?.manual) {
        throw error instanceof UserFacingError
          ? error
          : new UserFacingError(SYNC_FAILURE_MESSAGE);
      }
      return;
    }

    const failedKeys = new Set(
      (result.failed ?? []).map((item) => `${item.entityType}:${item.entityId}`),
    );
    for (const item of items) {
      if (failedKeys.has(`${item.entityType}:${item.entityId}`)) {
        await updateQueueStatus(item.id, 'FAILED', item.retryCount + 1);
        continue;
      }
      await updateQueueStatus(item.id, 'SYNCED');
      await markEntitySynced(item.entityType, item.entityId);
    }
    if (failedKeys.size > 0 && options?.manual) {
      throw new UserFacingError(SYNC_FAILURE_MESSAGE);
    }
  }

  try {
    await pullChanges();
  } catch (error) {
    if (options?.manual) {
      throw error instanceof UserFacingError
        ? error
        : new UserFacingError(SYNC_FAILURE_MESSAGE);
    }
  }
}

export const syncEngine = {
  async isOnline(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return isOnlineState(state);
    } catch {
      return false;
    }
  },

  status: () => queueCounts(),

  async pullFromCloud(): Promise<void> {
    if (!isDatabaseAvailable() || !(await getAccessToken())) {
      return;
    }
    await pullChanges();
  },

  /** Fire-and-forget after a local write. Offline is a no-op until connectivity returns. */
  request(): void {
    void this.run();
  },

  watchConnectivity(): () => void {
    if (networkSubscription) {
      return () => {
        networkSubscription?.remove();
        networkSubscription = null;
        lastOnline = null;
      };
    }

    void this.isOnline().then((online) => {
      lastOnline = online;
    });

    networkSubscription = Network.addNetworkStateListener((state) => {
      const online = isOnlineState(state);
      const wasOffline = lastOnline === false;
      lastOnline = online;
      if (online && wasOffline) {
        void this.run();
      }
    });

    return () => {
      networkSubscription?.remove();
      networkSubscription = null;
      lastOnline = null;
    };
  },

  async run(options?: SyncRunOptions): Promise<void> {
    const next = runChain.then(
      () => runOnce(options),
      () => runOnce(options),
    );
    runChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  },
};

async function applyRemoteChange(change: SyncChange): Promise<void> {
  const data = change.data ?? {};
  const timestamp = nowIso();
  const id = String(data.id ?? change.entityId);

  if (change.entityType === 'category') {
    if (change.operation === 'DELETE') {
      await getDatabase().runAsync(
        'UPDATE categories SET deleted_at = ?, sync_status = ?, updated_at = ? WHERE id = ?',
        timestamp,
        'SYNCED',
        timestamp,
        id,
      );
      return;
    }
    const existing = await categoryRepository.getById(id);
    const record = {
      id,
      name: String(data.name ?? ''),
      isActive: Boolean(data.isActive ?? true),
      sortOrder: Number(data.sortOrder ?? 0),
      syncStatus: 'SYNCED' as const,
      createdAt: String(data.createdAt ?? timestamp),
      updatedAt: String(data.updatedAt ?? timestamp),
    };
    if (!existing) {
      await categoryRepository.insert(record);
    } else if (record.updatedAt >= existing.updatedAt) {
      await categoryRepository.update(record);
    }
  }

  if (change.entityType === 'subcategory') {
    if (change.operation === 'DELETE') {
      await getDatabase().runAsync(
        'UPDATE sub_categories SET deleted_at = ?, sync_status = ?, updated_at = ? WHERE id = ?',
        timestamp,
        'SYNCED',
        timestamp,
        id,
      );
      return;
    }
    const existing = await subCategoryRepository.getById(id);
    const record = {
      id,
      categoryId: String(data.categoryId ?? ''),
      name: String(data.name ?? ''),
      isActive: Boolean(data.isActive ?? true),
      sortOrder: Number(data.sortOrder ?? 0),
      syncStatus: 'SYNCED' as const,
      createdAt: String(data.createdAt ?? timestamp),
      updatedAt: String(data.updatedAt ?? timestamp),
    };
    if (!existing) {
      await subCategoryRepository.insert(record);
    } else if (record.updatedAt >= existing.updatedAt) {
      await subCategoryRepository.update(record);
    }
  }

  if (change.entityType === 'expense') {
    if (change.operation === 'DELETE') {
      await expenseRepository.softDelete(id, timestamp);
      return;
    }
    const existing = await expenseRepository.getById(id);
    const record: LocalExpense = {
      id,
      expenseId: String(data.expenseId ?? id),
      expenseDate: String(data.expenseDate ?? ''),
      categoryId: String(data.categoryId ?? ''),
      subCategoryId: data.subCategoryId ? String(data.subCategoryId) : null,
      amount: Number(data.amount ?? 0),
      description: data.description ? String(data.description) : null,
      vendorId: null,
      gstRate: data.gstRate === null || data.gstRate === undefined ? null : Number(data.gstRate),
      gstAmount: data.gstAmount === null || data.gstAmount === undefined ? null : Number(data.gstAmount),
      paymentMethod: String(data.paymentMethod ?? 'Other') as PaymentMethod,
      billNumber: data.billNumber ? String(data.billNumber) : null,
      notes: data.notes ? String(data.notes) : null,
      syncStatus: 'SYNCED',
      createdAt: String(data.createdAt ?? timestamp),
      updatedAt: String(data.updatedAt ?? timestamp),
    };
    const category = await categoryRepository.getById(record.categoryId);
    if (!category) {
      return;
    }
    if (!existing) {
      await expenseRepository.insert(record);
    } else if (record.updatedAt >= existing.updatedAt) {
      await expenseRepository.update(record);
    }
  }

  if (change.entityType === 'budget') {
    if (change.operation === 'DELETE') {
      await getDatabase().runAsync(
        'UPDATE budgets SET deleted_at = ?, sync_status = ?, updated_at = ? WHERE id = ?',
        timestamp,
        'SYNCED',
        timestamp,
        id,
      );
      return;
    }
    const existing = await budgetRepository.getById(id);
    const record = {
      id,
      categoryId: String(data.categoryId ?? ''),
      periodType: String(data.periodType ?? 'MONTHLY') as import('@expense-tracker/shared').BudgetPeriodType,
      periodStart: String(data.periodStart ?? ''),
      periodEnd: String(data.periodEnd ?? ''),
      amount: Number(data.amount ?? 0),
      syncStatus: 'SYNCED' as const,
      createdAt: String(data.createdAt ?? timestamp),
      updatedAt: String(data.updatedAt ?? timestamp),
    };
    const category = await categoryRepository.getById(record.categoryId);
    if (!category) {
      return;
    }
    if (!existing) {
      await budgetRepository.insert(record);
    } else if (record.updatedAt >= existing.updatedAt) {
      await budgetRepository.update(record);
    }
  }

  if (change.entityType === 'debt_person') {
    if (change.operation === 'DELETE') {
      await getDatabase().runAsync(
        'UPDATE debt_people SET deleted_at = ?, sync_status = ?, updated_at = ? WHERE id = ?',
        timestamp,
        'SYNCED',
        timestamp,
        id,
      );
      return;
    }
    const existing = await debtPersonRepository.getById(id);
    const record = {
      id,
      name: String(data.name ?? ''),
      mobileNumber: String(data.mobileNumber ?? ''),
      direction: String(data.direction ?? 'TAKEN') as import('@expense-tracker/shared').DebtDirection,
      syncStatus: 'SYNCED' as const,
      createdAt: String(data.createdAt ?? timestamp),
      updatedAt: String(data.updatedAt ?? timestamp),
    };
    if (!existing) {
      await debtPersonRepository.insert(record);
    } else if (record.updatedAt >= existing.updatedAt) {
      await debtPersonRepository.update(record);
    }
  }

  if (change.entityType === 'debt_transaction') {
    if (change.operation === 'DELETE') {
      await getDatabase().runAsync(
        'UPDATE debt_transactions SET deleted_at = ?, sync_status = ?, updated_at = ? WHERE id = ?',
        timestamp,
        'SYNCED',
        timestamp,
        id,
      );
      return;
    }
    const personId = String(data.personId ?? '');
    const person = await debtPersonRepository.getById(personId);
    if (!person) {
      return;
    }
    const existing = await debtTransactionRepository.getById(id);
    const record = {
      id,
      personId,
      type: String(data.type ?? 'BORROWED') as import('@expense-tracker/shared').DebtTransactionType,
      amount: Number(data.amount ?? 0),
      transactionDate: String(data.transactionDate ?? ''),
      note: data.note ? String(data.note) : null,
      syncStatus: 'SYNCED' as const,
      createdAt: String(data.createdAt ?? timestamp),
      updatedAt: String(data.updatedAt ?? timestamp),
    };
    if (!existing) {
      await debtTransactionRepository.insert(record);
    } else if (record.updatedAt >= existing.updatedAt) {
      await debtTransactionRepository.update(record);
    }
  }
}
