import * as Network from 'expo-network';

import { getDatabase, isDatabaseAvailable } from '@/database';
import {
  attachmentRepository,
  businessProfileRepository,
  categoryRepository,
  expenseRepository,
  listDrainable,
  queueCounts,
  subCategoryRepository,
  updateQueueStatus,
  vendorRepository,
} from '@/database/repositories';
import type { SyncQueueRecord } from '@/database/repositories/syncQueueRepository';
import { apiRequest, getAccessToken } from '@/services/api';
import { nowIso } from '@/utils/text';

type SyncChange = {
  entityType: string;
  entityId: string;
  operation: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

function parsePayload(item: SyncQueueRecord): Record<string, unknown> {
  try {
    return JSON.parse(item.payload) as Record<string, unknown>;
  } catch {
    return { id: item.entityId };
  }
}

export const syncEngine = {
  async isOnline(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return Boolean(state.isConnected && state.isInternetReachable !== false);
    } catch {
      return false;
    }
  },

  status: () => queueCounts(),

  async run(): Promise<void> {
    if (!isDatabaseAvailable()) {
      return;
    }
    if (!(await this.isOnline())) {
      return;
    }
    if (!(await getAccessToken())) {
      return;
    }

    const items = await listDrainable();
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

      try {
        await apiRequest('/sync', { method: 'POST', body: { changes } });
        for (const item of items) {
          await updateQueueStatus(item.id, 'SYNCED');
        }
      } catch {
        for (const item of items) {
          await updateQueueStatus(item.id, 'FAILED', item.retryCount + 1);
        }
      }
    }

    try {
      const since = await getDatabase().getFirstAsync<{ value: string }>(
        "SELECT value FROM app_meta WHERE key = 'sync_since'",
      );
      const result = await apiRequest<{ changes: SyncChange[]; cursor: string }>(
        `/sync/changes?since=${encodeURIComponent(since?.value ?? '')}`,
      );
      for (const change of result.changes) {
        await applyRemoteChange(change);
      }
      await getDatabase().runAsync(
        `INSERT INTO app_meta (key, value) VALUES ('sync_since', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        result.cursor,
      );
    } catch {
      // Pull can wait until the API is configured.
    }
  },
};

async function applyRemoteChange(change: SyncChange): Promise<void> {
  const data = change.data;
  const timestamp = nowIso();
  if (change.entityType === 'category' && change.operation !== 'DELETE') {
    const existing = await categoryRepository.getById(String(data.id));
    const record = {
      id: String(data.id),
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
  if (change.entityType === 'expense' && change.operation === 'DELETE') {
    await expenseRepository.softDelete(change.entityId, timestamp);
  }
  void attachmentRepository;
  void businessProfileRepository;
  void subCategoryRepository;
  void vendorRepository;
}
