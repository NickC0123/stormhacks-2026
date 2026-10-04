import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpenseListSkeleton } from '@/components/expenses/ExpenseListSkeleton';
import { LoadState } from '@/components/ui/LoadState';
import { useFocusedData } from '@/hooks/useFocusedData';
import { listExpenses } from '@/lib/expenses';
import { useTheme, type Theme } from '@/theme';

/** Expenses linked to an event. */
export function EventExpenses({ eventId }: { eventId: string }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const loader = useCallback(() => listExpenses(0, eventId), [eventId]);
  const { data: expenses, loading, error, retry } = useFocusedData(
    loader,
    'Could not load expenses.',
  );

  if (!expenses) {
    if (loading) return <ExpenseListSkeleton />;
    return (
      <LoadState loading={false} error={error} fallbackError="Could not load expenses." onRetry={retry} />
    );
  }

  if (expenses.length === 0) {
    return <Text style={styles.empty}>No expenses for this event yet.</Text>;
  }

  return (
    <View style={styles.list}>
      {expenses.map((expense) => {
        const time = expense.time ? expense.time.slice(0, 5) : null;
        const meta = [
          expense.date,
          time,
          `${expense.currency} ${Number(expense.amount).toFixed(2)}`,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <Pressable
            key={expense.id}
            accessibilityRole="button"
            accessibilityLabel={`${expense.title}, ${meta}`}
            onPress={() =>
              router.push({
                pathname: '/expenses/[expenseId]',
                params: { expenseId: expense.id },
              })
            }
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.title} numberOfLines={1}>
              {expense.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
              {expense.receipt_image_path ? ' · Receipt' : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: theme.spacing[3],
    },
    empty: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    row: {
      padding: theme.spacing[4],
      borderRadius: theme.radius.lg,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.bgSurface,
      gap: theme.spacing[1.5],
    },
    rowPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    title: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
    },
    meta: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
  });
}
