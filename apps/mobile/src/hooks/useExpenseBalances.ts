import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useFocusedData } from '@/hooks/useFocusedData';
import { apiFetch } from '@/lib/api';
import type { BalanceDashboard } from '@/types';

const loadBalances = () => apiFetch<BalanceDashboard>('/balances');

export function useExpenseBalances() {
  const state = useFocusedData(loadBalances, 'Could not load balances.');
  const { reload } = state;
  useFocusEffect(useCallback(() => {
    const timer = setInterval(() => { void reload(); }, 15000);
    return () => clearInterval(timer);
  }, [reload]));
  return state;
}
