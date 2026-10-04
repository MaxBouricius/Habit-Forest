import { type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE trees (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        species     TEXT NOT NULL DEFAULT 'oak',
        period      TEXT NOT NULL CHECK (period IN ('day', 'week', 'month')),
        target      INTEGER NOT NULL CHECK (target >= 1),
        planted_at  INTEGER NOT NULL,
        archived_at INTEGER
      );

      CREATE TABLE waterings (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        tree_id    INTEGER NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
        watered_at INTEGER NOT NULL
      );

      CREATE INDEX idx_waterings_tree ON waterings(tree_id, watered_at);
    `);
    version = 1;
  }

  // Future changes go here, e.g.:
  // if (version === 1) { await db.execAsync('ALTER TABLE ...'); version = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}