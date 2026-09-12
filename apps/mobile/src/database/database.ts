import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';

const DATABASE_NAME = 'expense_tracker.db';

let database: SQLite.SQLiteDatabase | null = null;
let schemaVersion = 0;

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (database) {
    return database;
  }

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  schemaVersion = await runMigrations(db);
  database = db;
  try {
    const { seedMasterData } = await import('./seed');
    await seedMasterData();
  } catch (error) {
    database = null;
    schemaVersion = 0;
    throw error;
  }
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    throw new Error('Database is not ready');
  }
  return database;
}

export function getSchemaVersion(): number {
  return schemaVersion;
}

export function isDatabaseAvailable(): boolean {
  return database !== null;
}

export function getDatabaseName(): string {
  return DATABASE_NAME;
}
