import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

type LoadMode = 'initial' | 'refresh' | 'silent';

/**
 * Loads data whenever the screen gains focus, with pull-to-refresh and per-row busy state.
 * `loader` must be stable (wrap it in `useCallback`).
 */
export function useFocusedData<T>(loader: () => Promise<T>, errorMessage: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const loaded = useRef(false);

  const load = useCallback(
    async (mode: LoadMode) => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        setData(await loader());
        setError(null);
        loaded.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : errorMessage);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loader, errorMessage],
  );

  useFocusEffect(
    useCallback(() => {
      load(loaded.current ? 'silent' : 'initial');
    }, [load]),
  );

  /** Runs a row action, marks the row busy, then reloads. Failures show an alert. */
  async function run(id: string, action: () => Promise<unknown>, failTitle: string) {
    setBusyIds((ids) => new Set(ids).add(id));
    try {
      await action();
      await load('silent');
    } catch (err) {
      Alert.alert(failTitle, err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyIds((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
  }

  const reload = useCallback(() => load('silent'), [load]);

  return {
    reload,
    data,
    loading,
    refreshing,
    error,
    busyIds,
    run,
    refresh: () => load('refresh'),
    retry: () => load('initial'),
  };
}
