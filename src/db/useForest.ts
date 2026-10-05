import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { canWater, evaluateTree, Ground, groundState, periodStart, PeriodUnit, TreeState } from '../game/treeRules';

export type TreeRow = {
  id: number;
  name: string;
  species: string;
  period: PeriodUnit;
  target: number;
  plantedAt: number;
};

export type Tree = TreeRow & { state: TreeState; canWater: boolean; ground: Ground };

// TEST TOOL: 00:30 at the end of the current 05:00-to-05:00 day, so the droplet window can be seen.
// If it is already past that moment (say it is 02:00 now), the real time is used.
function simulatedNight(now: number) {
  const d = new Date(periodStart(now, 'day'));
  d.setDate(d.getDate() + 1);
  d.setHours(0, 30, 0, 0);
  return Math.max(now, d.getTime());
}

export function useForest() {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<TreeRow[]>([]);
  const [waterings, setWaterings] = useState<Record<number, number[]>>({});
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);
  const [simNight, setSimNight] = useState(false); // TEST TOOL: pretend it is just after midnight

  const reload = useCallback(async () => {
    const trees = await db.getAllAsync<TreeRow>(
      `SELECT id, name, species, period, target, planted_at AS plantedAt
       FROM trees WHERE archived_at IS NULL ORDER BY planted_at`
    );
    const logs = await db.getAllAsync<{ tree_id: number; watered_at: number }>(
      'SELECT tree_id, watered_at FROM waterings ORDER BY watered_at'
    );
    const byTree: Record<number, number[]> = {};
    for (const l of logs) (byTree[l.tree_id] ??= []).push(l.watered_at);
    setRows(trees);
    setWaterings(byTree);
    setNow(Date.now());
    setLoaded(true);
  }, [db]);

  // Reload whenever the screen comes into focus, e.g. when returning from the plant screen.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Keep the clock moving so droplets and decay update while the app is open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const viewNow = simNight ? simulatedNight(now) : now;

  const trees: Tree[] = useMemo(
    () =>
      rows.map((r) => {
        const input = {
          period: r.period,
          target: r.target,
          plantedAt: r.plantedAt,
          waterings: waterings[r.id] ?? [],
        };
        return {
          ...r,
          state: evaluateTree(input, viewNow),
          canWater: canWater(input, viewNow),
          ground: groundState(input, viewNow),
        };
      }),
    [rows, waterings, viewNow]
  );

  const plant = useCallback(
    async (name: string, species: string, period: PeriodUnit, target: number) => {
      await db.runAsync(
        'INSERT INTO trees (name, species, period, target, planted_at) VALUES (?, ?, ?, ?, ?)',
        [name, species, period, target, Date.now()]
      );
      await reload();
    },
    [db, reload]
  );

  const water = useCallback(
    async (treeId: number) => {
      if (simNight) return false; // the simulated clock is view-only
      const r = rows.find((x) => x.id === treeId);
      if (!r) return false;
      const input = {
        period: r.period,
        target: r.target,
        plantedAt: r.plantedAt,
        waterings: waterings[treeId] ?? [],
      };
      if (!canWater(input, Date.now())) return false;

      await db.runAsync('INSERT INTO waterings (tree_id, watered_at) VALUES (?, ?)', [treeId, Date.now()]);
      await reload();
      return true;
    },
    [db, reload, rows, waterings, simNight]
  );

  const archive = useCallback(
    async (treeId: number) => {
      await db.runAsync('UPDATE trees SET archived_at = ? WHERE id = ?', [Date.now(), treeId]);
      await reload();
    },
    [db, reload]
  );

  const rename = useCallback(
    async (treeId: number, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await db.runAsync('UPDATE trees SET name = ? WHERE id = ?', [trimmed, treeId]);
      await reload();
    },
    [db, reload]
  );

  // TEST TOOL: pretend `days` more days passed with the tree fully watered every day.
  const advance = useCallback(
    async (treeId: number, days: number) => {
      if (simNight) return; // the simulated clock is view-only
      const r = rows.find((x) => x.id === treeId);
      if (!r) return;
      const shift = days * 24 * 3600 * 1000;
      const todayStart = periodStart(Date.now(), 'day');
      const perDay = r.period === 'day' ? r.target : 1;
      await db.withTransactionAsync(async () => {
        await db.runAsync('UPDATE trees SET planted_at = planted_at - ? WHERE id = ?', [shift, treeId]);
        await db.runAsync('UPDATE waterings SET watered_at = watered_at - ? WHERE tree_id = ?', [shift, treeId]);
        for (let k = 1; k <= days; k++) {
          const d = new Date(todayStart);
          d.setDate(d.getDate() - k);
          const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0).getTime();
          for (let i = 0; i < perDay; i++) {
            await db.runAsync('INSERT INTO waterings (tree_id, watered_at) VALUES (?, ?)', [treeId, noon + i * 60000]);
          }
        }
      });
      await reload();
    },
    [db, reload, rows, simNight]
  );

   return { trees, loaded, plant, water, archive, rename, advance, simNight, setSimNight, reload };
}