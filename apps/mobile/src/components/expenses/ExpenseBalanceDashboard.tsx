import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LoadState } from '@/components/ui/LoadState';
import type { useExpenseBalances } from '@/hooks/useExpenseBalances';
import { CONTACTS, formatContact } from '@/lib/contacts';
import { displayName } from '@/lib/events';
import { formatCents, toCents, unconvertedNote } from '@/lib/expenses';
import { useTheme, type Theme } from '@/theme';
import type { BalanceDashboard } from '@/types';

type Props = { balances: ReturnType<typeof useExpenseBalances> };
type Person = BalanceDashboard['people'][number];
const cents = (amount: string) => toCents(amount) ?? 0;
const money = (amount: number, currency: string) => `$${formatCents(Math.abs(amount))} ${currency}`;

export function ExpenseBalanceDashboard({ balances }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [tab, setTab] = useState<'owed' | 'owing' | 'settled'>('owed');
  const [visibleCount, setVisibleCount] = useState(5);
  const [notice, setNotice] = useState('');
  const { data, loading, error, retry } = balances;
  const owed = data?.people.filter((person) => cents(person.owed_to_you) > 0) ?? [];
  const owing = data?.people.filter((person) => cents(person.you_owe) > 0) ?? [];
  const settled = data?.people.filter((person) => !cents(person.you_owe) && !cents(person.owed_to_you)) ?? [];
  const largestFirst = (field: 'you_owe' | 'owed_to_you') => (a: Person, b: Person) => cents(b[field]) - cents(a[field]);

  const people = tab === 'owed' ? owed.sort(largestFirst('owed_to_you')) : tab === 'owing' ? owing.sort(largestFirst('you_owe')) : settled;

  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Your balance</Text>
    {loading || error ? <LoadState loading={loading} error={error} fallbackError="Could not load balances." onRetry={retry} /> : null}
    {data ? <>
      {(data.totals.length ? data.totals : [{ currency: 'CAD', you_owe: '0.00', owed_to_you: '0.00' }]).map((total) => <View key={total.currency} style={styles.summary}>
        <View style={[styles.totalCard, { backgroundColor: theme.colors.successSubtle }]}>
          <Text style={styles.label}>Total owed to you</Text>
          <Text style={[styles.total, { color: theme.colors.success }]}>{money(cents(total.owed_to_you), total.currency)}</Text>
          <Text style={styles.caption}>Money to receive</Text>
        </View>
        <View style={[styles.totalCard, { backgroundColor: theme.colors.dangerSubtle }]}>
          <Text style={styles.label}>Total you owe</Text>
          <Text style={[styles.total, { color: theme.colors.danger }]}>{money(cents(total.you_owe), total.currency)}</Text>
          <Text style={styles.caption}>Money to pay back</Text>
        </View>
      </View>)}
      <Text style={styles.caption}>CAD · after offsets and recorded payments</Text>
      {notice ? <Text accessibilityRole="alert" style={[styles.paymentSummary, { color: theme.colors.success }]}>{notice}</Text> : null}
      {unconvertedNote(data.unconverted_currencies) ? <Text style={styles.hint}>{unconvertedNote(data.unconverted_currencies)}</Text> : null}
      <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Balance direction">
        {([
          { value: 'owed', label: 'Owes you', count: owed.length, color: theme.colors.success, background: theme.colors.successSubtle },
          { value: 'owing', label: 'You owe', count: owing.length, color: theme.colors.danger, background: theme.colors.dangerSubtle },
          { value: 'settled', label: 'Settled', count: settled.length, color: theme.colors.textSecondary, background: theme.colors.bgSurfaceAlt },
        ] as const).map((item) => <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: tab === item.value }}
          onPress={() => { setTab(item.value); setVisibleCount(5); }} style={[styles.tab, tab === item.value && { backgroundColor: item.background, borderColor: item.color }]}>
          <Text style={[styles.label, { color: item.color }]}>{item.label} ({item.count})</Text>
        </Pressable>)}
      </View>
      <Text accessibilityRole="header" style={styles.subheading}>{tab === 'owed' ? 'Who owes you' : tab === 'owing' ? 'Who you owe' : 'All settled'}</Text>
      {people.slice(0, visibleCount).map((person) =>
        <PersonCard key={`${person.user.id}:${person.currency}`} person={person} balances={balances}
          onRecorded={() => setNotice(`Payment with ${displayName(person.user)} recorded. Your totals are updated.`)} />)}
      {people.length > visibleCount ? <Button label={`Show more (${people.length - visibleCount})`} variant="ghost" onPress={() => setVisibleCount(visibleCount + 5)} /> : null}
      {!people.length ? <Text style={styles.empty}>
        {tab === 'owed' ? 'Nobody owes you money right now.' : tab === 'owing' ? 'You don’t owe anyone money right now.' : 'Recorded payments and settled balances will appear here.'}
      </Text> : null}
      <Text style={styles.caption}>Other currencies use approximate CAD exchange rates.</Text>
    </> : null}
  </View>;
}

function PersonCard({ person, balances, onRecorded }: { person: Person; balances: Props['balances']; onRecorded: () => void }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [showPayments, setShowPayments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const name = displayName(person.user);
  const owe = cents(person.you_owe) > 0;
  const owed = cents(person.owed_to_you) > 0;
  const amount = owe ? person.you_owe : person.owed_to_you;
  const key = `${person.user.id}:${person.currency}`;
  const payments = person.settlements.reduce((sum, payment) => sum + cents(payment.amount), 0);
  async function recordPayment() {
    const success = await balances.settle(person.user.id, amount, person.currency);
    if (success) {
      setConfirming(false);
      onRecorded();
    }
  }
  const preview = person.expenses.map((expense) => expense.title).slice(0, 2).join(' · ');

  return <View style={styles.personCard}>
    <View style={styles.personHeader}>
      <View style={styles.nameColumn}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.caption}>{owe ? 'You owe them' : owed ? 'They owe you' : 'All settled'}</Text>
      </View>
      <Text style={[styles.balanceAmount, { color: owe ? theme.colors.danger : owed ? theme.colors.success : theme.colors.textSecondary }]}>{money(cents(amount), person.currency)}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.disclosure}>
      <View style={styles.nameColumn}>
        <Text numberOfLines={1} style={styles.hint}>{preview || 'Recorded payments'}{person.expenses.length > 2 ? ` · +${person.expenses.length - 2} more` : ''}</Text>
        <Text style={styles.caption}>{person.expenses.length} expense{person.expenses.length === 1 ? '' : 's'} · {expanded ? 'Hide breakdown' : 'View breakdown'}</Text>
      </View>
      <Text style={styles.hint}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded ? <>
    {person.expenses.length ? <>
      <Text style={styles.caption}>For these expenses · shares before payments</Text>
      {person.expenses.map((expense) => {
        const share = cents(expense.amount);
        return <Pressable key={expense.expense_id} accessibilityRole="button" accessibilityLabel={`${expense.title}, ${share > 0 ? `${name}’s share` : 'your share'} ${money(share, person.currency)}. View expense.`}
          onPress={() => router.push({ pathname: '/expenses/[expenseId]', params: { expenseId: expense.expense_id } })} style={styles.expenseRow}>
          <View style={styles.nameColumn}>
            <Text style={styles.expenseTitle}>{expense.title}</Text>
            <Text style={styles.caption}>{share > 0 ? `${name}’s share · you paid` : 'Your share · they paid'}</Text>
          </View>
          <View style={styles.amountColumn}>
            <Text style={[styles.label, { color: share > 0 ? theme.colors.success : theme.colors.danger }]}>{money(share, person.currency)}</Text>
            <Text style={styles.caption}>View expense ›</Text>
          </View>
        </Pressable>;
      })}
    </> : null}
    {person.settlements.length ? <View style={styles.paymentSummary}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPayments }} onPress={() => setShowPayments(!showPayments)} style={styles.disclosure}>
        <Text style={[styles.hint, styles.nameColumn]}>Recorded payments{payments ? ` · ${money(payments, person.currency)} ${payments > 0 ? 'paid by you' : 'received'}` : ''}</Text>
        <Text style={styles.hint}>{showPayments ? '−' : '+'}</Text>
      </Pressable>
      {showPayments ? person.settlements.map((payment) => <View key={payment.id} style={styles.expenseRow}>
        <View style={styles.nameColumn}>
          <Text style={styles.hint}>{cents(payment.amount) > 0 ? 'You paid them' : 'They paid you'}</Text>
          <Text style={styles.caption}>{new Date(payment.created_at).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.label}>{money(cents(payment.amount), person.currency)}</Text>
      </View>) : null}
    </View> : null}
    {(person.expenses.some((expense) => cents(expense.amount) > 0) && person.expenses.some((expense) => cents(expense.amount) < 0)) || person.settlements.length ? <Text style={styles.hint}>Shares in both directions cancel out. Recorded payments are included in the balance above.</Text> : null}
    {owe && person.payment_contacts.length ? <View style={styles.paymentSummary}>
      <Text style={styles.label}>Where to pay {name}</Text>
      {person.payment_contacts.map((contact) => <Text key={contact.kind} selectable style={styles.hint}>{CONTACTS[contact.kind].label}: {formatContact(contact.kind, contact.value)}</Text>)}
      <Text style={styles.caption}>Press and hold payment details to copy.</Text>
    </View> : null}
    </> : null}
    {(owe || owed) && !confirming ? <Button label={owe ? 'I’ve paid this' : 'I’ve received this'} variant="secondary" loading={balances.busyIds.has(key)} onPress={() => setConfirming(true)}
      accessibilityLabel={owe ? `Record payment to ${name}` : `Record payment received from ${name}`} /> : null}
    {confirming ? <View style={styles.paymentSummary}>
      <Text style={styles.label}>{owe ? `Have you paid ${name}?` : `Have you received payment from ${name}?`}</Text>
      <Text style={styles.hint}>Record {money(cents(amount), person.currency)} and clear this balance for both of you.</Text>
      <Button label={owe ? 'Confirm paid' : 'Confirm received'} loading={balances.busyIds.has(key)} onPress={() => { void recordPayment(); }} />
      <Button label="Cancel" variant="ghost" disabled={balances.busyIds.has(key)} onPress={() => setConfirming(false)} />
    </View> : null}
  </View>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: { gap: theme.spacing[3] },
    heading: { ...theme.typography.h2, color: theme.colors.textPrimary },
    subheading: { ...theme.typography.h4, color: theme.colors.textPrimary, marginTop: theme.spacing[3] },
    tabs: { flexDirection: 'row', gap: theme.spacing[2] },
    tab: { flex: 1, minHeight: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.md, padding: theme.spacing[2] },
    summary: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[3] },
    totalCard: { flexGrow: 1, flexBasis: 145, padding: theme.spacing[4], borderRadius: theme.radius.lg, gap: theme.spacing[2] },
    total: { ...theme.typography.h4, fontVariant: ['tabular-nums'] },
    label: { ...theme.typography.button, color: theme.colors.textPrimary },
    hint: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    caption: { ...theme.typography.caption, color: theme.colors.textSecondary },
    empty: { ...theme.typography.bodySm, color: theme.colors.textSecondary, paddingVertical: theme.spacing[3] },
    personCard: { padding: theme.spacing[4], gap: theme.spacing[3], borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.bgSurface },
    personHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing[2], paddingBottom: theme.spacing[2] },
    nameColumn: { flex: 1, minWidth: 100, gap: theme.spacing[1] },
    name: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
    balanceAmount: { ...theme.typography.h4, fontVariant: ['tabular-nums'] },
    expenseRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], minHeight: theme.sizes.touchTarget, paddingVertical: theme.spacing[2], borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle },
    expenseTitle: { ...theme.typography.body, color: theme.colors.textPrimary },
    amountColumn: { alignItems: 'flex-end', gap: theme.spacing[1], flexShrink: 1 },
    paymentSummary: { padding: theme.spacing[3], borderRadius: theme.radius.md, backgroundColor: theme.colors.bgSurfaceAlt, gap: theme.spacing[2] },
    disclosure: { minHeight: theme.sizes.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[2] },
  });
}
