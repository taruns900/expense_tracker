import type { SQLiteDatabase } from 'expo-sqlite';

import { INIT_MIGRATION_SQL } from './001_init';
import { migrateVendorFields } from './002_vendor_fields';
import { migrateBudgetDebt } from './003_budget_debt';

type Migration = {
  version: number;
  sql?: string;
  run?: (db: SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  { version: 1, sql: INIT_MIGRATION_SQL },
  { version: 2, run: migrateVendorFields },
  { version: 3, run: migrateBudgetDebt },
];

export async function runMigrations(db: SQLiteDatabase): Promise<number> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC',
  );
  const appliedSet = new Set(applied.map((row) => row.version));
  let latest = 0;

  for (const migration of MIGRATIONS) {
    latest = Math.max(latest, migration.version);
    if (appliedSet.has(migration.version)) {
      continue;
    }

    if (migration.sql) {
      await db.execAsync(migration.sql);
    }
    if (migration.run) {
      await migration.run(db);
    }
    await db.runAsync(
      'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      migration.version,
      new Date().toISOString(),
    );
  }

  return latest;
}
