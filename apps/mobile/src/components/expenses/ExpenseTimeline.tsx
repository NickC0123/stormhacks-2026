import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';
import type { Expense } from '@/types';

type Props = {
  expenses: Expense[];
  /** Optional footer under the grouped list (e.g. Load more). */
  footer?: React.ReactNode;
};

/** Date-grouped expense cards shared by Events → Expenses and the All Expenses tab. */
export function ExpenseTimeline({ expenses, footer }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const group = groups.get(expense.date) ?? [];
    group.push(expense);
    groups.set(expense.date, group);
  }

  return (
    <View style={styles.list}>
      {Array.from(groups, ([date, dayExpenses]) => {
        const heading = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return (
          <View key={date} style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <Text accessibilityRole="header" style={styles.dateTitle}>
                {heading}
              </Text>
              <Text style={styles.meta}>
                {dayExpenses.length} expense{dayExpenses.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.dayCard}>
              {dayExpenses.map((expense, index) => {
                const amount = Number(expense.amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const meta = [
                  expense.time?.slice(0, 5),
                  expense.receipt_image_path ? 'Receipt attached' : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <Pressable
                    key={expense.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${expense.title}, ${amount} ${expense.currency}, ${heading}${expense.description ? `, ${expense.description}` : ''}`}
                    onPress={() =>
                      router.push({
                        pathname: '/expenses/[expenseId]',
                        params: { expenseId: expense.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.row,
                      index > 0 && styles.rowDivider,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.expenseInfo}>
                      <Text style={styles.title} numberOfLines={2}>
                        {expense.title}
                      </Text>
                      {expense.description?.trim() ? (
                        <Text style={styles.description} numberOfLines={2}>
                          {expense.description.trim()}
                        </Text>
                      ) : null}
                      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                    </View>
                    <View style={styles.amountColumn}>
                      <Text style={styles.amount}>{amount}</Text>
                      <Text style={styles.meta}>{expense.currency}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {footer}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: { gap: theme.spacing[6] },
    dateGroup: { gap: theme.spacing[3] },
    dateHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing[2],
    },
    dateTitle: { ...theme.typography.label, color: theme.colors.textSecondary },
    dayCard: {
      borderRadius: theme.radius.lg,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.bgSurface,
      overflow: 'hidden',
    },
    expenseInfo: { flex: 1, minWidth: 100, gap: theme.spacing[1] },
    amountColumn: { alignItems: 'flex-end', gap: theme.spacing[1] },
    amount: {
      ...theme.typography.h2,
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    description: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    rowDivider: {
      borderTopWidth: theme.sizes.borderWidth,
      borderTopColor: theme.colors.borderSubtle,
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
