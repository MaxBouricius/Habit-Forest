import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

// The name of the player's park/forest, stored in the settings table. null = not named yet.
export function useParkName() {
  const db = useSQLiteContext();
  const [name, setName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['parkName']);
    setName(row?.value ?? null);
    setLoaded(true);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const save = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['parkName', trimmed]
      );
      setName(trimmed);
    },
    [db]
  );

    return { name, loaded, save, reload };
}