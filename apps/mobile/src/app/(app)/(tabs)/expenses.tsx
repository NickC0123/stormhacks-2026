import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ExpenseBalanceDashboard } from '@/components/expenses/ExpenseBalanceDashboard';
import { ExpenseInvitations } from '@/components/expenses/ExpenseInvitations';
import { ExpenseListSkeleton } from '@/components/expenses/ExpenseListSkeleton';
import { SpendingByCategory } from '@/components/expenses/SpendingByCategory';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { Screen } from '@/components/ui/Screen';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useExpenseBalances } from '@/hooks/useExpenseBalances';
import { useSpending } from '@/hooks/useSpending';
import { listExpenses } from '@/lib/expenses';
import { useTheme } from '@/theme';
import type { Expense } from '@/types';

export default function ExpensesScreen() {
  const theme = useTheme();
  const balances = useExpenseBalances();
  const spending = useSpending();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  async function refresh() {
    await Promise.all([balances.refresh(), spending.refresh(), listExpenses().then((rows) => {
      setExpenses(rows); setHasMore(rows.length === 100); setError('');
    }).catch((err) => setError(err instanceof Error ? err.message : 'Could not load expenses.'))]);
  }

  return (
    <Screen
      title="Expenses"
      titleVariant="page"
      titleColor="accent"
      titleAlign="center"
      onRefresh={refresh}
      refreshing={balances.refreshing}
      headerLeft={<View />}
      headerRight={
        <CircleIconButton
          accessibilityLabel="Add expense"
          onPress={() => router.push('/expenses/new')}
        >
          <SFSymbolIcon name="plus" />
        </CircleIconButton>
      }
    >

    <View style={{ gap: 12, marginTop: 20 }}>
      <SpendingByCategory spending={spending} />
      <ExpenseBalanceDashboard balances={balances} />
      <ExpenseInvitations />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showHistory }} onPress={() => setShowHistory(!showHistory)}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
        <Text style={{ ...theme.typography.h4, color: theme.colors.textPrimary }}>All expenses</Text>
        <Text style={{ ...theme.typography.bodySm, color: theme.colors.accentStrong }}>{showHistory ? 'Hide −' : 'Show +'}</Text>
      </Pressable>
      <Text style={{ ...theme.typography.bodySm, color: theme.colors.textSecondary }}>Your full expense history, including paid and personal expenses.</Text>
      {showHistory ? <View style={{ gap: 12 }}>
        {loading && expenses.length === 0 ? <ExpenseListSkeleton lines={3} /> : null}
        {error ? <Text style={{ color: theme.colors.textPrimary }}>{error}</Text> : null}
        {!loading && !error && expenses.length === 0 ? <Text style={{ color: theme.colors.textSecondary }}>No expenses yet.</Text> : null}
        {expenses.map((expense) => <Pressable key={expense.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/expenses/[expenseId]', params: { expenseId: expense.id } })}
          style={{ padding: 16, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.borderSubtle, gap: 6 }}>
          <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary }}>{expense.title}</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{expense.date}{expense.time ? ` · ${expense.time.slice(0, 5)}` : ''} · Total bill: {expense.currency} {Number(expense.amount).toFixed(2)}</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{expense.event_id ? 'Event expense' : 'Standalone expense'}{expense.receipt_image_path ? ' · Receipt attached' : ''}</Text>
        </Pressable>)}
        {hasMore ? <Pressable disabled={loadingMore} onPress={more} accessibilityRole="button"><Text style={{ color: theme.colors.accentStrong }}>{loadingMore ? 'Loading…' : 'Load more'}</Text></Pressable> : null}
      </View> : null}

    </View>
  </Screen>
  );
}
