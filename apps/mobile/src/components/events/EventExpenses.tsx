import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpenseListSkeleton } from '@/components/expenses/ExpenseListSkeleton';
import { Button } from '@/components/ui/Button';
import { LoadState } from '@/components/ui/LoadState';
import { useFocusedData } from '@/hooks/useFocusedData';
import { listExpenses } from '@/lib/expenses';
import { useTheme, type Theme } from '@/theme';
import type { Expense } from '@/types';

/** Date sorting happens on the server before pagination. */
export function EventExpenses({ eventId, refreshVersion = 0 }: { eventId: string; refreshVersion?: number }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  return <View style={{ gap: theme.spacing[4] }}>
    <View style={styles.sortRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${order === 'desc' ? 'Newest first' : 'Oldest first'}. Sort ${order === 'desc' ? 'oldest' : 'newest'} first`}
        accessibilityHint="Reverses the expense date order"
        onPress={() => setOrder((current) => current === 'desc' ? 'asc' : 'desc')}
        style={({ pressed }) => [styles.sortButton, pressed && styles.sortPressed]}
      >
        <View pointerEvents="none" style={[styles.sortStack, order === 'asc' && styles.sortStackFlipped]}>
          <View style={[styles.sortLine, { width: 18 }]} />
          <View style={[styles.sortLine, { width: 12 }]} />
          <View style={[styles.sortLine, { width: 6 }]} />
        </View>
      </Pressable>
    </View>
    <EventExpenseList key={`${eventId}:${order}`} eventId={eventId} order={order} refreshVersion={refreshVersion} />
  </View>;
}

function EventExpenseList({ eventId, order, refreshVersion }: { eventId: string; order: 'asc' | 'desc'; refreshVersion: number }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [pages, setPages] = useState(1);
  const loader = useCallback(async () => {
    void refreshVersion;
    const rows: Expense[] = [];
    let hasMore = false;
    for (let page = 0; page < pages; page += 1) {
      const batch = await listExpenses(page * 100, eventId, order);
      rows.push(...batch);
      hasMore = batch.length === 100;
      if (!hasMore) break;
    }
    return { expenses: rows, hasMore };
  }, [eventId, order, pages, refreshVersion]);
  const { data, loading, error, retry } = useFocusedData(loader, 'Could not load expenses.');
  const expenses = data?.expenses;

  if (!expenses) {
    if (loading) return <ExpenseListSkeleton />;
    return (
      <LoadState loading={false} error={error} fallbackError="Could not load expenses." onRetry={retry} />
    );
  }

  if (expenses.length === 0) {
    return <Text style={styles.empty}>No expenses for this event yet.</Text>;
  }

  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const group = groups.get(expense.date) ?? [];
    group.push(expense);
    groups.set(expense.date, group);
  }

  return (
    <View style={styles.list}>
      {error ? <LoadState loading={false} error={error} fallbackError="Could not load expenses." onRetry={retry} /> : null}
      {Array.from(groups, ([date, dayExpenses]) => {
        const heading = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        });
        return <View key={date} style={styles.dateGroup}>
          <View style={styles.dateHeader}>
            <Text accessibilityRole="header" style={styles.dateTitle}>{heading}</Text>
            <Text style={styles.meta}>{dayExpenses.length} expense{dayExpenses.length === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.dayCard}>
            {dayExpenses.map((expense, index) => {
              const amount = Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const meta = [expense.time?.slice(0, 5), expense.receipt_image_path ? 'Receipt attached' : null].filter(Boolean).join(' · ');
              return <Pressable
                key={expense.id}
                accessibilityRole="button"
                accessibilityLabel={`${expense.title}, ${amount} ${expense.currency}, ${heading}${expense.description ? `, ${expense.description}` : ''}`}
                onPress={() => router.push({ pathname: '/expenses/[expenseId]', params: { expenseId: expense.id } })}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && styles.rowPressed]}
              >
                <View style={styles.expenseInfo}>
                  <Text style={styles.title} numberOfLines={2}>{expense.title}</Text>
                  {expense.description?.trim() ? <Text style={styles.description} numberOfLines={2}>{expense.description.trim()}</Text> : null}
                  {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                </View>
                <View style={styles.amountColumn}>
                  <Text style={styles.amount}>{amount}</Text>
                  <Text style={styles.meta}>{expense.currency}</Text>
                </View>
              </Pressable>;
            })}
          </View>
        </View>;
      })}
      {data?.hasMore ? <Button label="Load more expenses" variant="ghost" onPress={() => setPages((count) => count + 1)} /> : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    sortRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: -theme.spacing[3],
    },
    sortButton: {
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
    },
    sortPressed: { backgroundColor: theme.colors.bgSurfaceAlt },
    sortStack: { alignItems: 'center', gap: 3 },
    sortStackFlipped: { transform: [{ rotate: '180deg' }] },
    sortLine: { height: 2, borderRadius: 1, backgroundColor: theme.colors.textSecondary },
    list: { gap: theme.spacing[6] },
    dateGroup: { gap: theme.spacing[3] },
    dateHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[2] },
    dateTitle: { ...theme.typography.label, color: theme.colors.textSecondary },
    dayCard: { borderRadius: theme.radius.lg, borderWidth: theme.sizes.borderWidth, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.bgSurface, overflow: 'hidden' },
    expenseInfo: { flex: 1, minWidth: 100, gap: theme.spacing[1] },
    amountColumn: { alignItems: 'flex-end', gap: theme.spacing[1] },
    amount: { ...theme.typography.h2, color: theme.colors.textPrimary, fontVariant: ['tabular-nums'] },
    description: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    rowDivider: { borderTopWidth: theme.sizes.borderWidth, borderTopColor: theme.colors.borderSubtle },
    empty: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    row: {
      padding: theme.spacing[4],
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing[4],
    },
    rowPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    title: {
      ...theme.typography.bodyStrong,
      color: theme.colors.textPrimary,
    },
    meta: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
  });
}
