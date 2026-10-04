import { StyleSheet, Text, View } from 'react-native';

import { SpendingCardSkeleton } from '@/components/expenses/ExpenseCardSkeletons';
import { DonutChart } from '@/components/ui/DonutChart';
import { LoadState } from '@/components/ui/LoadState';
import type { useSpending } from '@/hooks/useSpending';
import { categoryLabels, formatCents, isItemCategory, toCents, unconvertedNote } from '@/lib/expenses';
import { useTheme, type Theme } from '@/theme';
import type { SpendingSummary } from '@/types';

type Props = { spending: ReturnType<typeof useSpending> };

/** Your share of spending by category, after amounts you owe and are owed are split out. */
export function SpendingByCategory({ spending }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { data, loading, error, retry } = spending;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">
          Spending By Category
        </Text>
        <Text style={styles.hint}>Your share only. Converted to CAD (approx.).</Text>
      </View>
      {loading || error ? (
        <LoadState
          loading={loading}
          error={error}
          fallbackError="Could not load spending."
          onRetry={retry}
          skeleton={<SpendingCardSkeleton />}
        />
      ) : null}
      {data && !data.by_category.length ? (
        <Text style={styles.hint}>
          No spending yet. Your share of each expense will appear here by category.
        </Text>
      ) : null}
      {data?.by_category.length ? <CadSpending summary={data} styles={styles} theme={theme} /> : null}
      {data && unconvertedNote(data.unconverted_currencies) ? (
        <Text style={styles.hint}>{unconvertedNote(data.unconverted_currencies)}</Text>
      ) : null}
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function CadSpending({
  summary,
  styles,
  theme,
}: {
  summary: SpendingSummary;
  styles: Styles;
  theme: Theme;
}) {
  const total = toCents(summary.total) ?? 0;
  const rows = [...summary.by_category]
    .map(({ category, amount }) => {
      const cents = toCents(amount) ?? 0;
      const share = total ? (cents / total) * 100 : 0;
      return {
        key: category,
        label: isItemCategory(category) ? categoryLabels[category] : category,
        cents,
        percent: share > 0 && share < 1 ? '<1%' : `${Math.round(share)}%`,
      };
    })
    .sort((a, b) => b.cents - a.cents)
    .map((row, index) => ({
      ...row,
      color:
        index === 0
          ? theme.colors.accent
          : theme.colors.chartSeries[(index - 1) % theme.colors.chartSeries.length],
    }));
  const description = rows
    .map((row) => `${row.label} ${formatCents(row.cents)}, ${row.percent}`)
    .join('; ');

  return (
    <>
      <View style={styles.chartBlock}>
        <DonutChart
          segments={rows.map(({ key, cents, color }) => ({ key, value: cents, color }))}
          accessibilityLabel={`Spending in CAD: total $${formatCents(total)}. ${description}.`}
        >
          <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
            ${formatCents(total)}
          </Text>
          <Text style={styles.caption}>Total (CAD)</Text>
        </DonutChart>
      </View>
      <View style={styles.legend} accessibilityRole="list">
        {rows.map((row) => (
          <View
            key={row.key}
            accessibilityRole="text"
            accessibilityLabel={`${row.label}, ${formatCents(row.cents)}, ${row.percent}`}
            style={styles.legendRow}
          >
            <View style={[styles.swatch, { backgroundColor: row.color }]} />
            <Text style={styles.label} numberOfLines={2}>
              {row.label}
            </Text>
            <Text style={styles.amount}>${formatCents(row.cents)}</Text>
            <Text style={styles.percent}>{row.percent}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      marginTop: theme.spacing[2],
      gap: theme.spacing[3],
      padding: theme.spacing[4],
      borderRadius: theme.radius['2xl'],
      backgroundColor: theme.colors.bgSurface,
    },
    header: {
      gap: theme.spacing[0.5],
    },
    heading: {
      ...theme.typography.sectionTitle,
      color: theme.colors.textPrimary,
    },
    hint: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    chartBlock: {
      marginTop: theme.spacing[2],
    },
    total: {
      ...theme.typography.h4,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    caption: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    legend: {
      gap: theme.spacing[2],
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    swatch: {
      width: theme.sizes.swatch,
      height: theme.sizes.swatch,
      borderRadius: theme.radius.full,
    },
    label: {
      ...theme.typography.bodySm,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    amount: {
      ...theme.typography.bodySm,
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    percent: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      minWidth: theme.spacing[10],
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
  });
}
