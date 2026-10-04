import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LoadState } from '@/components/ui/LoadState';
import type { useExpenseBalances } from '@/hooks/useExpenseBalances';
import { CONTACTS, formatContact } from '@/lib/contacts';
import { displayName } from '@/lib/events';
import { formatCents, settleUp, toCents, unconvertedNote } from '@/lib/expenses';
import { useTheme } from '@/theme';

type Props = { balances: ReturnType<typeof useExpenseBalances> };

export function ExpenseBalanceDashboard({ balances }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, loading, error, retry, busyIds, run } = balances;
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
        const amount = owe ? person.you_owe : person.owed_to_you;
        const confirmSettle = () => Alert.alert(
          owe ? `Mark as paid to ${name}?` : `Mark ${name}’s debt as paid?`,
          `${owe ? `You paid ${name}` : `${name} paid you`} ${person.currency} ${amount}. This brings your balance with them to zero.`,
          [{ text: 'Cancel', style: 'cancel' },
            { text: 'Mark paid', onPress: () => { void run(key, () => settleUp(person.user.id, amount), 'Could not settle up'); } }],
        );
        return <View key={key} style={card}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View expenses with ${name}`}
            accessibilityState={{ expanded: expanded === key }} onPress={() => setExpanded(expanded === key ? null : key)}>
            <Text style={{ ...theme.typography.body, color: theme.colors.textPrimary }}>{name}</Text>
            <Text style={text}>{owe ? `You owe ${person.currency} ${person.you_owe}`
              : owed ? `Owes you ${person.currency} ${person.owed_to_you}` : `Even · ${person.currency}`}</Text>
            <Text style={text}>{expanded === key ? 'Hide expenses' : 'View expenses'}</Text>
          </Pressable>
          {owe ? person.payment_contacts.map((contact) => <Text key={contact.kind} selectable style={text}>
            {CONTACTS[contact.kind].label}: <Text style={{ color: theme.colors.textPrimary }}>{formatContact(contact.kind, contact.value)}</Text> (press and hold to copy)
          </Text>) : null}
          {owe || owed ? <Button label={owe ? 'Settle up' : 'Mark as paid'} size="sm" variant="secondary"
            accessibilityLabel={owe ? `Settle up with ${name}` : `Mark ${name}’s debt as paid`}
            loading={busyIds.has(key)} onPress={confirmSettle} /> : null}
          {expanded === key ? person.expenses.map((expense) => {
            const cents = toCents(expense.amount) ?? 0;
            return <Pressable key={expense.expense_id} accessibilityRole="button"
              onPress={() => router.push({ pathname: '/expenses/[expenseId]', params: { expenseId: expense.expense_id } })}
              style={{ paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.textPrimary }}>{expense.title}</Text>
              <Text style={text}>{cents < 0 ? 'You owe' : 'Owes you'} {person.currency} {formatCents(Math.abs(cents))}</Text>
            </Pressable>;
          }) : null}
          {expanded === key ? person.settlements.map((payment) => {
            const cents = toCents(payment.amount) ?? 0;
            return <View key={payment.id} style={{ paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.textPrimary }}>Settled up</Text>
              <Text style={text}>{cents > 0 ? `You paid ${name}` : `${name} paid you`} {person.currency} {formatCents(Math.abs(cents))}</Text>
            </View>;
          }) : null}
        </View>;
      })}
      {unconvertedNote(data.unconverted_currencies) ? <Text style={text}>{unconvertedNote(data.unconverted_currencies)}</Text> : null}
      <Text style={text}>All amounts are in CAD; other currencies are converted at approximate rates. Opposite amounts with the same person cancel out, and payments marked as paid are subtracted. Balances refresh while this tab is open.</Text>
      <Button label="Refresh balances" variant="ghost" loading={balances.refreshing} onPress={balances.refresh} />
    </> : null}
  </View>;
}
