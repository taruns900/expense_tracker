import { getDatabase, isDatabaseAvailable } from './database';

export const APP_META_KEYS = {
  seedVersion: 'master_data_seed_version',
  syncSince: 'sync_since',
  cloudUserId: 'cloud_user_id',
  rebindFromCloud: 'rebind_from_cloud',
} as const;

export async function getAppMeta(key: string): Promise<string | null> {
  if (!isDatabaseAvailable()) {
    return null;
  }
  const row = await getDatabase().getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setAppMeta(key: string, value: string): Promise<void> {
  await getDatabase().runAsync(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function deleteAppMeta(key: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM app_meta WHERE key = ?', key);
}
