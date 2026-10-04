import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useFocusedData } from '@/hooks/useFocusedData';
import { listSpending } from '@/lib/expenses';

/** Refreshes on the same schedule as balances, since both change when people join or leave. */
export function useSpending() {
  const state = useFocusedData(listSpending, 'Could not load spending.');
  const { reload } = state;
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => { void reload(); }, 15000);
    return () => clearInterval(timer);
  }, [reload]));
  return state;
}
