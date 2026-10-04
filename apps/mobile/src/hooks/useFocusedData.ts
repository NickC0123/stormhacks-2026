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
  const requestVersion = useRef(0);
  const inFlightActions = useRef(new Set<string>());

  const load = useCallback(
    async (mode: LoadMode) => {
      const version = ++requestVersion.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await loader();
        if (version !== requestVersion.current) return;
        setData(result);
        setError(null);
        loaded.current = true;
      } catch (err) {
        if (version === requestVersion.current) setError(err instanceof Error ? err.message : errorMessage);
      } finally {
        if (version === requestVersion.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [loader, errorMessage],
  );

  useFocusEffect(
    useCallback(() => {
      load(loaded.current ? 'silent' : 'initial');
    }, [load]),
  );

  /** Applies an authoritative mutation response, or reloads after a row action. */
  async function run<R>(id: string, action: () => Promise<R>, failTitle: string, resultToData?: (result: R) => T) {
    if (inFlightActions.current.has(id)) return false;
    inFlightActions.current.add(id);
    setBusyIds((ids) => new Set(ids).add(id));
    try {
      const result = await action();
      if (resultToData) {
        // Invalidate polls begun before the mutation so they cannot restore a stale balance.
        requestVersion.current += 1;
        setData(resultToData(result));
        setError(null);
        setLoading(false);
        setRefreshing(false);
        loaded.current = true;
      } else {
        await load('silent');
      }
      return true;
    } catch (err) {
      Alert.alert(failTitle, err instanceof Error ? err.message : 'Please try again.');
      setError(err instanceof Error ? err.message : failTitle);
      return false;
    } finally {
      inFlightActions.current.delete(id);
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
