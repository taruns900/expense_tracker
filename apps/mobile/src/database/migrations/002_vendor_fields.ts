import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateVendorFields(db: SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(vendors)');
  const names = new Set(columns.map((column) => column.name));
  const additions: Array<[string, string]> = [
    ['email', 'TEXT'],
    ['phone', 'TEXT'],
    ['address', 'TEXT'],
    ['gst_number', 'TEXT'],
  ];

  for (const [column, type] of additions) {
    if (!names.has(column)) {
      await db.execAsync(`ALTER TABLE vendors ADD COLUMN ${column} ${type}`);
    }
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}
