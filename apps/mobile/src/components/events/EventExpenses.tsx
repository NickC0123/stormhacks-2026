import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpenseListSkeleton } from '@/components/expenses/ExpenseListSkeleton';
import { ExpenseTimeline } from '@/components/expenses/ExpenseTimeline';
import { Button } from '@/components/ui/Button';
import { LoadState } from '@/components/ui/LoadState';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useFocusedData } from '@/hooks/useFocusedData';
import { listExpenses } from '@/lib/expenses';
import { useTheme, type Theme } from '@/theme';
import type { Expense } from '@/types';

/** Date sorting happens on the server before pagination. */
export function EventExpenses({
  eventId,
  refreshVersion = 0,
}: {
  eventId: string;
  refreshVersion?: number;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  /** null = default (unfiltered), then asc, then desc, then back to null. */
  const [sort, setSort] = useState<'asc' | 'desc' | null>(null);
  const order = sort ?? 'desc';

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.heading}>
            Event expenses
          </Text>
          <Text style={styles.caption}>Total expenses for this event only.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            sort === null
              ? 'Default order. Sort oldest first'
              : sort === 'asc'
                ? 'Sorted oldest first. Sort newest first'
                : 'Sorted newest first. Clear sort'
          }
          accessibilityHint="Cycles default, ascending, and descending date order"
          onPress={() => {
            setSort((current) => {
              if (current === null) return 'asc';
              if (current === 'asc') return 'desc';
              return null;
            });
          }}
          style={({ pressed }) => [styles.sortButton, pressed && styles.sortPressed]}
        >
          <SFSymbolIcon
            name={
              sort === null
                ? 'arrow.up.arrow.down'
                : sort === 'asc'
                  ? 'arrow.up'
                  : 'arrow.down'
            }
            size={theme.sizes.iconMd}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>
      <EventExpenseList
        key={`${eventId}:${sort ?? 'default'}`}
        eventId={eventId}
        order={order}
        refreshVersion={refreshVersion}
      />
    </View>
  );
}

function EventExpenseList({
  eventId,
  order,
  refreshVersion,
}: {
  eventId: string;
  order: 'asc' | 'desc';
  refreshVersion: number;
}) {
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
      <LoadState
        loading={false}
        error={error}
        fallbackError="Could not load expenses."
        onRetry={retry}
      />
    );
  }

  if (expenses.length === 0) {
    return <Text style={styles.empty}>No expenses for this event yet.</Text>;
  }

  return (
    <View>
      {error ? (
        <LoadState
          loading={false}
          error={error}
          fallbackError="Could not load expenses."
          onRetry={retry}
        />
      ) : null}
      <ExpenseTimeline
        expenses={expenses}
        footer={
          data?.hasMore ? (
            <Button
              label="Load more expenses"
              variant="ghost"
              onPress={() => setPages((count) => count + 1)}
            />
          ) : null
        }
      />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    root: { gap: theme.spacing[4] },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing[3],
    },
    headerCopy: {
      flex: 1,
      gap: theme.spacing[1],
    },
    heading: {
      ...theme.typography.sectionTitle,
      color: theme.colors.textPrimary,
    },
    caption: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    sortButton: {
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      marginTop: -theme.spacing[2],
      marginRight: -theme.spacing[2],
    },
    sortPressed: { backgroundColor: theme.colors.bgSurfaceAlt },
    empty: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
  });
}
