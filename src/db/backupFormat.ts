// The backup file format and its validation. No imports on purpose: this file is plain logic, so it is easy to test.

export const BACKUP_APP = 'habit-forest';
export const BACKUP_VERSION = 1;

export type BackupTree = {
  id: number;
  name: string;
  species: string;
  period: 'day' | 'week' | 'month';
  target: number;
  plantedAt: number;
  archivedAt: number | null;
};

export type BackupWatering = { id: number; treeId: number; wateredAt: number };

export type Backup = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  parkName: string | null;
  trees: BackupTree[]; // includes archived trees, so a restore brings everything back
  waterings: BackupWatering[];
};

const PERIODS = ['day', 'week', 'month'];
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

// Reads and checks a backup file's text. Throws an Error with a plain-language message if anything is wrong,
// so a bad file is rejected before any data is touched.
export function parseBackup(text: string): Backup {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON, so it is not a backup.');
  }
  if (!raw || typeof raw !== 'object' || raw.app !== BACKUP_APP) {
    throw new Error('This is not a Habit Forest backup file.');
  }
  if (!isInt(raw.version) || raw.version < 1) throw new Error('The backup has no valid version number.');
  if (raw.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app. Update the app first.');
  }
  if (!Array.isArray(raw.trees) || !Array.isArray(raw.waterings)) {
    throw new Error('The backup is missing its trees or waterings.');
  }

  const treeIds = new Set<number>();
  const trees: BackupTree[] = raw.trees.map((t: any, i: number) => {
    const at = `Tree ${i + 1}`;
    if (!isInt(t?.id) || t.id < 1) throw new Error(`${at} has an invalid id.`);
    if (treeIds.has(t.id)) throw new Error(`${at} repeats id ${t.id}.`);
    treeIds.add(t.id);
    if (typeof t.name !== 'string' || !t.name.trim()) throw new Error(`${at} has no name.`);
    if (typeof t.species !== 'string' || !t.species) throw new Error(`${at} has no species.`);
    if (!PERIODS.includes(t.period)) throw new Error(`${at} has an invalid period.`);
    if (!isInt(t.target) || t.target < 1 || t.target > 1000) throw new Error(`${at} has an invalid target.`);
    if (!isTime(t.plantedAt)) throw new Error(`${at} has an invalid planting time.`);
    const archivedAt = t.archivedAt ?? null;
    if (archivedAt !== null && !isTime(archivedAt)) throw new Error(`${at} has an invalid archive time.`);
    return {
      id: t.id,
      name: t.name.trim(),
      species: t.species,
      period: t.period,
      target: t.target,
      plantedAt: t.plantedAt,
      archivedAt,
    };
  });

  const wateringIds = new Set<number>();
  const waterings: BackupWatering[] = raw.waterings.map((w: any, i: number) => {
    const at = `Watering ${i + 1}`;
    if (!isInt(w?.id) || w.id < 1) throw new Error(`${at} has an invalid id.`);
    if (wateringIds.has(w.id)) throw new Error(`${at} repeats id ${w.id}.`);
    wateringIds.add(w.id);
    if (!isInt(w.treeId) || !treeIds.has(w.treeId)) throw new Error(`${at} belongs to a tree that is not in the backup.`);
    if (!isTime(w.wateredAt)) throw new Error(`${at} has an invalid time.`);
    return { id: w.id, treeId: w.treeId, wateredAt: w.wateredAt };
  });

  return {
    app: BACKUP_APP,
    version: raw.version,
    exportedAt: isTime(raw.exportedAt) ? raw.exportedAt : 0,
    parkName: typeof raw.parkName === 'string' && raw.parkName.trim() ? raw.parkName.trim() : null,
    trees,
    waterings,
  };
}