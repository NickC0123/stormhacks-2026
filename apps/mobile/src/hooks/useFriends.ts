import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  acceptFriendRequest,
  getFriends,
  removeFriendship,
  sendFriendRequest,
} from '@/lib/friends';
import type { FriendsOverview, Friendship } from '@/types';

type LoadMode = 'initial' | 'refresh' | 'silent';

export type FriendsState = ReturnType<typeof useFriends>;

/** Friends list and pending requests, reloaded whenever the screen gains focus. */
export function useFriends() {
  const [data, setData] = useState<FriendsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const loaded = useRef(false);

  const load = useCallback(async (mode: LoadMode) => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      setData(await getFriends());
      setError(null);
      loaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load friends.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(loaded.current ? 'silent' : 'initial');
    }, [load]),
  );

  async function runAction(id: string, action: () => Promise<unknown>, failTitle: string) {
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

  async function send(username: string): Promise<Friendship> {
    const friendship = await sendFriendRequest(username);
    await load('silent');
    return friendship;
  }

  return {
    data,
    loading,
    refreshing,
    error,
    busyIds,
    refresh: () => load('refresh'),
    retry: () => load('initial'),
    send,
    accept: (id: string) => runAction(id, () => acceptFriendRequest(id), 'Could not accept request'),
    remove: (id: string, failTitle: string) => runAction(id, () => removeFriendship(id), failTitle),
  };
}
