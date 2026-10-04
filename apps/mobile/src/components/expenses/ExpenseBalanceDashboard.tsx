import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LoadState } from '@/components/ui/LoadState';
import type { useExpenseBalances } from '@/hooks/useExpenseBalances';
import { displayName } from '@/lib/events';
import { formatCents, toCents } from '@/lib/expenses';
import { useTheme } from '@/theme';

type Props = { balances: ReturnType<typeof useExpenseBalances> };

export function ExpenseBalanceDashboard({ balances }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, loading, error, retry } = balances;
  const text = { ...theme.typography.bodySm, color: theme.colors.textSecondary };
  const card = { padding: 16, borderRadius: 12, backgroundColor: theme.colors.bgSurface, gap: 8 };
  return <View style={{ gap: 12 }}>
    <Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary }}>Your balances</Text>
    {loading || error ? <LoadState loading={loading} error={error} fallbackError="Could not load balances." onRetry={retry} /> : null}
    {data ? <>
      {data.totals.length ? data.totals.map((total) => <View key={total.currency} style={card}>
        <Text style={text}>{total.currency}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
          <View><Text style={text}>You owe</Text><Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary }}>{total.you_owe}</Text></View>
          <View><Text style={text}>You’re owed</Text><Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary }}>{total.owed_to_you}</Text></View>
        </View>
      </View>) : <Text style={text}>You owe 0.00 · You’re owed 0.00. Add people to an expense to start sharing.</Text>}
      {data.people.map((person) => {
        const key = `${person.user.id}:${person.currency}`;
        const owe = Number(person.you_owe) > 0;
        const owed = Number(person.owed_to_you) > 0;
        const name = displayName(person.user);
        return <View key={key} style={card}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View expenses with ${name}`}
            accessibilityState={{ expanded: expanded === key }} onPress={() => setExpanded(expanded === key ? null : key)}>
            <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary }}>{name}</Text>
            <Text style={text}>{owe ? `You owe ${person.currency} ${person.you_owe}`
              : owed ? `Owes you ${person.currency} ${person.owed_to_you}` : `Even · ${person.currency}`}</Text>
            <Text style={text}>{expanded === key ? 'Hide expenses' : 'View expenses'}</Text>
          </Pressable>
          {expanded === key ? person.expenses.map((expense) => {
            const cents = toCents(expense.amount) ?? 0;
            return <Pressable key={expense.expense_id} accessibilityRole="button"
              onPress={() => router.push({ pathname: '/expenses/[expenseId]', params: { expenseId: expense.expense_id } })}
              style={{ paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.textPrimary }}>{expense.title}</Text>
              <Text style={text}>{cents < 0 ? 'You owe' : 'Owes you'} {person.currency} {formatCents(Math.abs(cents))}</Text>
            </Pressable>;
          }) : null}
        </View>;
      })}
      <Text style={text}>Opposite amounts with the same person cancel out within each currency. Balances refresh while this tab is open.</Text>
      <Button label="Refresh balances" variant="ghost" loading={balances.refreshing} onPress={balances.refresh} />
    </> : null}
  </View>;
}
