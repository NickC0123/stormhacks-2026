import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpenseBalanceDashboard } from '@/components/expenses/ExpenseBalanceDashboard';
import { ExpenseInvitations } from '@/components/expenses/ExpenseInvitations';
import { ExpenseListSkeleton } from '@/components/expenses/ExpenseListSkeleton';
import { SpendingByCategory } from '@/components/expenses/SpendingByCategory';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { Screen } from '@/components/ui/Screen';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { Tabs } from '@/components/ui/Tabs';
import { useExpenseBalances } from '@/hooks/useExpenseBalances';
import { useSpending } from '@/hooks/useSpending';
import { listExpenses } from '@/lib/expenses';
import { useTheme, type Theme } from '@/theme';
import type { Expense } from '@/types';

type ExpensesTab = 'summary' | 'all';

const EXPENSE_TABS: { value: ExpensesTab; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'all', label: 'All Expenses' },
];

export default function ExpensesScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const balances = useExpenseBalances();
  const spending = useSpending();
  const [tab, setTab] = useState<ExpensesTab>('summary');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    listExpenses()
      .then((rows) => {
        if (active) {
          setExpenses(rows);
          setHasMore(rows.length === 100);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load expenses.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useFocusEffect(load);

  async function more() {
    setLoadingMore(true);
    setError('');
    try {
      const rows = await listExpenses(expenses.length);
      setExpenses((current) => [...current, ...rows]);
      setHasMore(rows.length === 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more expenses.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function refresh() {
    await Promise.all([
      balances.refresh(),
      spending.refresh(),
      listExpenses()
        .then((rows) => {
          setExpenses(rows);
          setHasMore(rows.length === 100);
          setError('');
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : 'Could not load expenses.'),
        ),
    ]);
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
      <View style={styles.content}>
        <Tabs
          tabs={EXPENSE_TABS}
          value={tab}
          onChange={setTab}
          accessibilityLabel="Expense sections"
        />

        {tab === 'summary' ? (
          <View style={styles.panel}>
            <SpendingByCategory spending={spending} />
            <ExpenseBalanceDashboard balances={balances} />
            <ExpenseInvitations />
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.hint}>
              Your full expense history, including paid and personal expenses.
            </Text>
            {loading && expenses.length === 0 ? <ExpenseListSkeleton lines={3} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!loading && !error && expenses.length === 0 ? (
              <Text style={styles.empty}>No expenses yet.</Text>
            ) : null}
            {expenses.map((expense) => (
              <Pressable
                key={expense.id}
                accessibilityRole="button"
                accessibilityLabel={expense.title}
                onPress={() =>
                  router.push({
                    pathname: '/expenses/[expenseId]',
                    params: { expenseId: expense.id },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.rowTitle}>{expense.title}</Text>
                <Text style={styles.rowMeta}>
                  {expense.date}
                  {expense.time ? ` · ${expense.time.slice(0, 5)}` : ''} · Total bill:{' '}
                  {expense.currency} {Number(expense.amount).toFixed(2)}
                </Text>
                <Text style={styles.rowMeta}>
                  {expense.event_id ? 'Event expense' : 'Standalone expense'}
                  {expense.receipt_image_path ? ' · Receipt attached' : ''}
                </Text>
              </Pressable>
            ))}
            {hasMore ? (
              <Pressable
                disabled={loadingMore}
                onPress={() => void more()}
                accessibilityRole="button"
                accessibilityLabel={loadingMore ? 'Loading more expenses' : 'Load more expenses'}
                accessibilityState={{ disabled: loadingMore }}
                style={({ pressed }) => [
                  styles.loadMore,
                  pressed && !loadingMore && styles.loadMorePressed,
                  loadingMore && styles.loadMoreDisabled,
                ]}
              >
                <Text style={styles.loadMoreLabel}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    content: {
      marginTop: theme.spacing[5],
      gap: theme.spacing[4],
    },
    panel: {
      gap: theme.spacing[3],
    },
    hint: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    empty: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    error: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
    },
    row: {
      padding: theme.spacing[4],
      borderRadius: theme.radius.md,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      gap: theme.spacing[2],
      minHeight: theme.sizes.touchTarget,
    },
    rowPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    rowTitle: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
    },
    rowMeta: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    loadMore: {
      minHeight: theme.sizes.touchTarget,
      justifyContent: 'center',
    },
    loadMorePressed: {
      opacity: 0.85,
    },
    loadMoreDisabled: {
      opacity: theme.opacity.disabled,
    },
    loadMoreLabel: {
      ...theme.typography.bodySm,
      color: theme.colors.accentStrong,
    },
  });
}
