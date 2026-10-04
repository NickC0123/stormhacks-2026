import { StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header">Spending by category</Text>
      <Text style={styles.hint}>Your share of each expense, so amounts others owe you are left out and amounts you owe are included. Other currencies are converted to CAD at approximate rates.</Text>
      {loading || error ? <LoadState loading={loading} error={error} fallbackError="Could not load spending." onRetry={retry} /> : null}
      {data && !data.by_category.length ? <Text style={styles.hint}>No spending yet. Your share of each expense will appear here by category.</Text> : null}
      {data?.by_category.length ? <CadSpending summary={data} styles={styles} theme={theme} /> : null}
      {data && unconvertedNote(data.unconverted_currencies) ? <Text style={styles.hint}>{unconvertedNote(data.unconverted_currencies)}</Text> : null}
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function CadSpending({ summary, styles, theme }: { summary: SpendingSummary; styles: Styles; theme: Theme }) {
  const total = toCents(summary.total) ?? 0;
  const rows = summary.by_category.map(({ category, amount }) => {
    const known = isItemCategory(category) ? category : 'other';
    const cents = toCents(amount) ?? 0;
    const share = total ? (cents / total) * 100 : 0;
    return {
      key: category,
      label: isItemCategory(category) ? categoryLabels[category] : category,
      color: theme.colors.chartCategory[known],
      cents,
      percent: share > 0 && share < 1 ? '<1%' : `${Math.round(share)}%`,
    };
  });
  const description = rows.map((row) => `${row.label} ${formatCents(row.cents)}, ${row.percent}`).join('; ');

  return (
    <View style={styles.card}>
      <DonutChart
        segments={rows.map(({ key, cents, color }) => ({ key, value: cents, color }))}
        accessibilityLabel={`Spending in ${summary.currency}: total ${formatCents(total)}. ${description}.`}
      >
        <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>{formatCents(total)}</Text>
        <Text style={styles.caption}>{summary.currency} total</Text>
      </DonutChart>
      <View style={styles.legend}>
        {rows.map((row) => (
          <View key={row.key} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: row.color }]} />
            <Text style={styles.label} numberOfLines={2}>{row.label}</Text>
            <Text style={styles.amount}>{formatCents(row.cents)}</Text>
            <Text style={styles.percent}>{row.percent}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing[3],
    },
    heading: {
      ...theme.typography.h2,
      color: theme.colors.textPrimary,
    },
    hint: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    card: {
      gap: theme.spacing[4],
      padding: theme.spacing[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.bgSurface,
    },
    total: {
      ...theme.typography.h4,
      color: theme.colors.textPrimary,
    },
    caption: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
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
      ...theme.typography.body,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    amount: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    percent: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      minWidth: theme.spacing[10],
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
  });
}
