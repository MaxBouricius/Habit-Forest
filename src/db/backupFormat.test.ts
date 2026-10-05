import { BACKUP_VERSION, parseBackup } from './backupFormat';

const good = () => ({
  app: 'habit-forest',
  version: 1,
  exportedAt: 1791210678480,
  parkName: 'Paisley Park',
  trees: [
    { id: 1, name: 'Skin Care', species: 'pine', period: 'day', target: 2, plantedAt: 1789856093817, archivedAt: null },
    { id: 2, name: 'Old', species: 'oak', period: 'week', target: 3, plantedAt: 1791129732311, archivedAt: 1791130052068 },
  ],
  waterings: [
    { id: 1, treeId: 1, wateredAt: 1789856095534 },
    { id: 2, treeId: 2, wateredAt: 1791129736664 },
  ],
});
const parse = (o: unknown) => parseBackup(JSON.stringify(o));

describe('parseBackup', () => {
  test('accepts a valid backup and keeps every field', () => {
    const b = parse(good());
    expect(b.trees).toHaveLength(2);
    expect(b.waterings).toHaveLength(2);
    expect(b.parkName).toBe('Paisley Park');
    expect(b.trees[1].archivedAt).toBe(1791130052068);
  });

  test('a missing parkName or archivedAt becomes null', () => {
    const o: any = good();
    delete o.parkName;
    delete o.trees[0].archivedAt;
    const b = parse(o);
    expect(b.parkName).toBeNull();
    expect(b.trees[0].archivedAt).toBeNull();
  });

  test('rejects text that is not JSON', () => {
    expect(() => parseBackup('hello')).toThrow('not valid JSON');
  });

  test('rejects JSON that is not one of our backups', () => {
    expect(() => parse({ app: 'other', version: 1, trees: [], waterings: [] })).toThrow('not a Habit Forest backup');
    expect(() => parse([1, 2, 3])).toThrow('not a Habit Forest backup');
  });

  test('rejects a backup from a newer version', () => {
    const o: any = good();
    o.version = BACKUP_VERSION + 1;
    expect(() => parse(o)).toThrow('newer version');
  });

  test('rejects bad trees', () => {
    const base: any = good();
    for (const [field, value, message] of [
      ['period', 'year', 'invalid period'],
      ['target', 0, 'invalid target'],
      ['target', 1.5, 'invalid target'],
      ['name', '  ', 'no name'],
      ['plantedAt', 'yesterday', 'invalid planting time'],
      ['archivedAt', 'x', 'invalid archive time'],
    ] as const) {
      const o: any = JSON.parse(JSON.stringify(base));
      o.trees[0][field] = value;
      expect(() => parse(o)).toThrow(message);
    }
  });

  test('rejects duplicate ids', () => {
    const o: any = good();
    o.trees[1].id = 1;
    expect(() => parse(o)).toThrow('repeats id 1');
    const p: any = good();
    p.waterings[1].id = 1;
    expect(() => parse(p)).toThrow('repeats id 1');
  });

  test('rejects a watering for a tree that is not in the file', () => {
    const o: any = good();
    o.waterings[0].treeId = 99;
    expect(() => parse(o)).toThrow('not in the backup');
  });
});