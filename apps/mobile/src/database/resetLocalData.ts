import { seedMasterData } from './seed';
import { APP_META_KEYS, deleteAppMeta } from './appMeta';
import { getDatabase } from './database';

type ResetOptions = {
  seed?: boolean;
};

export async function resetLocalData(options: ResetOptions = {}): Promise<void> {
  const db = getDatabase();
  await db.execAsync(`
    DELETE FROM expense_attachments;
    DELETE FROM expenses;
    DELETE FROM sub_categories;
    DELETE FROM categories;
    DELETE FROM vendors;
    DELETE FROM business_profile;
    DELETE FROM sync_queue;
  `);
  await deleteAppMeta(APP_META_KEYS.seedVersion);
  await deleteAppMeta(APP_META_KEYS.syncSince);
  if (options.seed !== false) {
    await seedMasterData();
  }
}
