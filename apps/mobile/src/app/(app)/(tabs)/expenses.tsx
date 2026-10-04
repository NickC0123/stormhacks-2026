import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ExpenseInvitations } from '@/components/expenses/ExpenseInvitations';
import { Screen } from '@/components/ui/Screen';
import { listExpenses } from '@/lib/expenses';
import { useTheme } from '@/theme';
import type { Expense } from '@/types';

export default function ExpensesScreen() {
  const theme = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    listExpenses().then((rows) => {
      if (active) { setExpenses(rows); setHasMore(rows.length === 100); }
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load expenses.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useFocusEffect(load);

  async function more() {
    setLoadingMore(true);
    setError('');
    try {
      const rows = await listExpenses(expenses.length);
      setExpenses((current) => [...current, ...rows]);
      setHasMore(rows.length === 100);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load more expenses.'); }
    finally { setLoadingMore(false); }
  }

  return <Screen title="Expenses" description="Your saved expenses, with or without an event.">
    <View style={{ gap: 12, marginTop: 20 }}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/expenses/new')} style={{ padding: 14, borderRadius: 10, backgroundColor: theme.colors.accent }}>
        <Text style={{ ...theme.typography.body, color: theme.colors.onAccent }}>New expense</Text>
      </Pressable>
      <ExpenseInvitations />
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={{ color: theme.colors.textPrimary }}>{error}</Text> : null}
      {!loading && !error && expenses.length === 0 ? <Text style={{ color: theme.colors.textSecondary }}>No expenses yet.</Text> : null}
      {expenses.map((expense) => <Pressable key={expense.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/expenses/[expenseId]', params: { expenseId: expense.id } })}
        style={{ padding: 16, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.borderSubtle, gap: 6 }}>
        <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary }}>{expense.title}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{expense.date}{expense.time ? ` · ${expense.time.slice(0, 5)}` : ''} · {expense.currency} {Number(expense.amount).toFixed(2)}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{expense.event_id ? 'Part of an event' : 'No event'}{expense.receipt_image_path ? ' · Receipt attached' : ''}</Text>
      </Pressable>)}
      {hasMore ? <Pressable disabled={loadingMore} onPress={more} accessibilityRole="button"><Text style={{ color: theme.colors.accentStrong }}>{loadingMore ? 'Loading…' : 'Load more'}</Text></Pressable> : null}
    </View>
  </Screen>;
}
