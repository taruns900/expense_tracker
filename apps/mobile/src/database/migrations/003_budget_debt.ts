import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateBudgetDebt(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT NOT NULL,
      period_type TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      amount REAL NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_category_period
      ON budgets(category_id, period_start, period_end)
      WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_start, period_end);
    CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);

    CREATE TABLE IF NOT EXISTS debt_people (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      mobile_number TEXT NOT NULL,
      direction TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_debt_people_mobile
      ON debt_people(mobile_number)
      WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS debt_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_date TEXT NOT NULL,
      note TEXT,
      sync_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (person_id) REFERENCES debt_people(id)
    );

    CREATE INDEX IF NOT EXISTS idx_debt_transactions_person_id ON debt_transactions(person_id);
    CREATE INDEX IF NOT EXISTS idx_debt_transactions_date ON debt_transactions(transaction_date);
  `);
}
