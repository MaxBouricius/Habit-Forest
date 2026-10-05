import { type SQLiteDatabase } from 'expo-sqlite';
import { Backup, BackupTree, BackupWatering, BACKUP_APP, BACKUP_VERSION } from './backupFormat';

export async function buildBackup(db: SQLiteDatabase): Promise<Backup> {
  const trees = await db.getAllAsync<BackupTree>(
    `SELECT id, name, species, period, target, planted_at AS plantedAt, archived_at AS archivedAt
     FROM trees ORDER BY id`
  );
  const waterings = await db.getAllAsync<BackupWatering>(
    `SELECT id, tree_id AS treeId, watered_at AS wateredAt FROM waterings ORDER BY id`
  );
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['parkName']);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    parkName: row?.value ?? null,
    trees,
    waterings,
  };
}

// Replaces everything in the app with the contents of a checked backup.
// It all happens in one transaction: if anything fails, nothing is changed.
export async function restoreBackup(db: SQLiteDatabase, backup: Backup) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM waterings');
    await db.runAsync('DELETE FROM trees');
    for (const t of backup.trees) {
      await db.runAsync(
        'INSERT INTO trees (id, name, species, period, target, planted_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.name, t.species, t.period, t.target, t.plantedAt, t.archivedAt]
      );
    }
    for (const w of backup.waterings) {
      await db.runAsync('INSERT INTO waterings (id, tree_id, watered_at) VALUES (?, ?, ?)', [w.id, w.treeId, w.wateredAt]);
    }
    if (backup.parkName) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['parkName', backup.parkName]
      );
    } else {
      await db.runAsync('DELETE FROM settings WHERE key = ?', ['parkName']);
    }
  });
}