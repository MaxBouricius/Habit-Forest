import { type SQLiteDatabase } from 'expo-sqlite';
import { assignMissing } from '../game/grid';

const DATABASE_VERSION = 3;

// Gives every active tree without a valid spot a free cell on the map.
// Called after the v3 migration, and meant to be called again after a restore.
export async function placeUnplacedTrees(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ id: number; grid_x: number | null; grid_y: number | null }>(
    'SELECT id, grid_x, grid_y FROM trees WHERE archived_at IS NULL ORDER BY id'
  );
  const moves = assignMissing(rows.map((r) => ({ id: r.id, gridX: r.grid_x, gridY: r.grid_y })));
  for (const m of moves) {
    await db.runAsync('UPDATE trees SET grid_x = ?, grid_y = ? WHERE id = ?', [m.x, m.y, m.id]);
  }
}

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

  if (version === 1) {
    // Version 2: a small key/value table for app settings (the park name lives here)
    await db.execAsync(`
      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    version = 2;
  }

  if (version === 2) {
    // Version 3: where each tree stands on the world map (null = not placed yet)
    await db.execAsync(`
      ALTER TABLE trees ADD COLUMN grid_x INTEGER;
      ALTER TABLE trees ADD COLUMN grid_y INTEGER;
    `);
    await placeUnplacedTrees(db);
    version = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}