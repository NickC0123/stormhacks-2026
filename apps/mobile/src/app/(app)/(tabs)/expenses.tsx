import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpenseBalanceDashboard } from '@/components/expenses/ExpenseBalanceDashboard';
import { ExpenseInvitations } from '@/components/expenses/ExpenseInvitations';
import { ExpenseListSkeleton } from '@/components/expenses/ExpenseListSkeleton';
import { ExpenseTimeline } from '@/components/expenses/ExpenseTimeline';
import { SpendingByCategory } from '@/components/expenses/SpendingByCategory';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { Screen } from '@/components/ui/Screen';
import { Select } from '@/components/ui/Select';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { Tabs } from '@/components/ui/Tabs';
import { useExpenseBalances } from '@/hooks/useExpenseBalances';
import { useSpending } from '@/hooks/useSpending';
import { categoryLabels, listExpenses } from '@/lib/expenses';
import { useTheme, type Theme } from '@/theme';
import type { Expense, ItemCategory } from '@/types';

type ExpensesTab = 'summary' | 'all';
type CategoryFilter = 'all' | ItemCategory;

const EXPENSE_TABS: { value: ExpensesTab; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'all', label: 'All Expenses' },
];

const CATEGORY_VALUES = Object.keys(categoryLabels) as ItemCategory[];

/** Expense counts for “all” and per category (for the filter menu). */
function categoryFilterOptions(expenses: Expense[]) {
  const byCategory = Object.fromEntries(CATEGORY_VALUES.map((key) => [key, 0])) as Record<
    ItemCategory,
    number
  >;
  for (const expense of expenses) {
    const seen = new Set<ItemCategory>();
    for (const item of expense.items) {
      if (seen.has(item.category)) continue;
      seen.add(item.category);
      byCategory[item.category] += 1;
    }
  }
  return [
    {
      value: 'all' as const,
      label: 'All Categories',
      meta: String(expenses.length),
      disabled: expenses.length === 0,
    },
    ...CATEGORY_VALUES.map((value) => ({
      value,
      label: categoryLabels[value],
      meta: String(byCategory[value]),
      disabled: byCategory[value] === 0,
    })),
  ];
}

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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const filterOptions = categoryFilterOptions(expenses);
  const filteredExpenses =
    categoryFilter === 'all'
      ? expenses
      : expenses.filter((expense) =>
          expense.items.some((item) => item.category === categoryFilter),
        );

  useEffect(() => {
    if (categoryFilter === 'all') return;
    const stillHasCategory = expenses.some((expense) =>
      expense.items.some((item) => item.category === categoryFilter),
    );
    if (!stillHasCategory) setCategoryFilter('all');
  }, [categoryFilter, expenses]);

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
          <View style={styles.list}>
            <Select
              value={categoryFilter}
              options={filterOptions}
              onChange={setCategoryFilter}
              accessibilityLabel="Filter expenses by category"
              placeholder="All Categories"
            />
            {loading && expenses.length === 0 ? <ExpenseListSkeleton lines={3} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!loading && !error && expenses.length === 0 ? (
              <Text style={styles.empty}>No expenses yet.</Text>
            ) : null}
            {!loading && !error && expenses.length > 0 && filteredExpenses.length === 0 ? (
              <Text style={styles.empty}>No expenses in this category.</Text>
            ) : null}
            {filteredExpenses.length > 0 ? (
              <ExpenseTimeline
                expenses={filteredExpenses}
                footer={
                  hasMore && categoryFilter === 'all' ? (
                    <Pressable
                      disabled={loadingMore}
                      onPress={() => void more()}
                      accessibilityRole="button"
                      accessibilityLabel={
                        loadingMore ? 'Loading more expenses' : 'Load more expenses'
                      }
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
                  ) : null
                }
              />
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
      gap: theme.spacing[6],
    },
    list: {
      gap: theme.spacing[4],
    },
    empty: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    error: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
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
