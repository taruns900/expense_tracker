const DATABASE_NAME = 'expense_tracker.db';

let schemaVersion = 0;

export async function initializeDatabase(): Promise<null> {
  schemaVersion = 0;
  return null;
}

export function getDatabase(): never {
  throw new Error('Database is not ready');
}

export function getSchemaVersion(): number {
  return schemaVersion;
}

export function isDatabaseAvailable(): boolean {
  return false;
}

export function getDatabaseName(): string {
  return DATABASE_NAME;
}
