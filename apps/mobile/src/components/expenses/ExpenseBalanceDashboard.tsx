import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BalanceSectionSkeleton } from '@/components/expenses/ExpenseCardSkeletons';
import { BottomDrawer } from '@/components/ui/BottomDrawer';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { CopyButton } from '@/components/ui/CopyButton';
import { LoadState } from '@/components/ui/LoadState';
import { useSnackbar } from '@/components/ui/Snackbar';
import type { useExpenseBalances } from '@/hooks/useExpenseBalances';
import {
  loadPaidChecks,
  paidStorageKey,
  prunePaidIds,
  savePaidChecks,
  type PaidChecksMap,
} from '@/lib/balancePaid';
import { CONTACTS, formatContact } from '@/lib/contacts';
import { displayName } from '@/lib/events';
import { formatCents, toCents, unconvertedNote } from '@/lib/expenses';
import { useTheme, type Theme } from '@/theme';
import type { BalanceDashboard } from '@/types';

type Props = { balances: ReturnType<typeof useExpenseBalances>; eventOnly?: boolean };
type Person = BalanceDashboard['people'][number];
type PersonKey = { userId: string; currency: string };

const cents = (amount: string) => toCents(amount) ?? 0;
const money = (amount: number, currency: string) => `$${formatCents(Math.abs(amount))} ${currency}`;
const personKey = (person: Person): PersonKey => ({
  userId: person.user.id,
  currency: person.currency,
});
const samePerson = (a: PersonKey, b: PersonKey) =>
  a.userId === b.userId && a.currency === b.currency;
/** Formats expense `YYYY-MM-DD` (or ISO datetime) in local time. */
const formatExpenseDate = (value: string) => {
  const dayPart = value.slice(0, 10);
  const [year, month, day] = dayPart.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
const metaLine = (expenseCount: number, paidCount: number) =>
  `${expenseCount} expense${expenseCount === 1 ? '' : 's'} · ${paidCount} paid`;

/** Single shared event title when every expense is on the same event. */
function sharedEventTitle(person: Person): string | null {
  const titles = [
    ...new Set(
      person.expenses
        .map((expense) => expense.event_title?.trim())
        .filter((title): title is string => Boolean(title)),
    ),
  ];
  return titles.length === 1 ? titles[0] : null;
}

export function ExpenseBalanceDashboard({ balances, eventOnly = false }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { showSnackbar } = useSnackbar();
  const [selectedKey, setSelectedKey] = useState<PersonKey | null>(null);
  const [paidByPerson, setPaidByPerson] = useState<PaidChecksMap>({});
  const { data, loading, error, retry } = balances;
  const owed = (data?.people.filter((person) => cents(person.owed_to_you) > 0) ?? []).sort(
    (a, b) => cents(b.owed_to_you) - cents(a.owed_to_you),
  );
  const owing = (data?.people.filter((person) => cents(person.you_owe) > 0) ?? []).sort(
    (a, b) => cents(b.you_owe) - cents(a.you_owe),
  );
  const selected =
    selectedKey && data
      ? (data.people.find((person) => samePerson(personKey(person), selectedKey)) ?? null)
      : null;

  useEffect(() => {
    void loadPaidChecks().then(setPaidByPerson);
  }, []);

  useEffect(() => {
    if (!data) return;
    setPaidByPerson((current) => {
      let changed = false;
      const next: PaidChecksMap = { ...current };
      for (const person of data.people) {
        const key = paidStorageKey(person.user.id, person.currency);
        const pruned = prunePaidIds(
          current[key],
          person.expenses.map((expense) => expense.expense_id),
        );
        if (pruned.length !== (current[key]?.length ?? 0)) {
          changed = true;
          if (pruned.length) next[key] = pruned;
          else delete next[key];
        }
      }
      if (changed) void savePaidChecks(next);
      return changed ? next : current;
    });
  }, [data]);

  useEffect(() => {
    if (selectedKey && data && !selected) setSelectedKey(null);
  }, [data, selected, selectedKey]);

  const onRecorded = useCallback(
    async (person: Person) => {
      const key = paidStorageKey(person.user.id, person.currency);
      setPaidByPerson((current) => {
        if (!(key in current)) return current;
        const next = { ...current };
        delete next[key];
        void savePaidChecks(next);
        return next;
      });
      setSelectedKey(null);
      showSnackbar({
        message: `Payment with ${displayName(person.user)} recorded.`,
        variant: 'success',
        overModal: true,
      });
    },
    [showSnackbar],
  );

  const onSavePaid = useCallback(
    async (person: Person, expenseIds: string[]) => {
      const key = paidStorageKey(person.user.id, person.currency);
      const pruned = prunePaidIds(
        expenseIds,
        person.expenses.map((expense) => expense.expense_id),
      );
      setPaidByPerson((current) => {
        const next = { ...current };
        if (pruned.length) next[key] = pruned;
        else delete next[key];
        void savePaidChecks(next);
        return next;
      });
      setSelectedKey(null);
      showSnackbar({
        message: pruned.length
          ? `Saved ${pruned.length} paid expense${pruned.length === 1 ? '' : 's'} with ${displayName(person.user)}.`
          : `Cleared paid marks with ${displayName(person.user)}.`,
        variant: 'success',
        overModal: true,
      });
    },
    [showSnackbar],
  );

  function paidCountFor(person: Person) {
    const key = paidStorageKey(person.user.id, person.currency);
    return prunePaidIds(
      paidByPerson[key],
      person.expenses.map((expense) => expense.expense_id),
    ).length;
  }

  return (
    <View style={styles.section}>
      {eventOnly ? (
        <View style={styles.eventOnlyHeader}>
          <Text accessibilityRole="header" style={styles.subheading}>
            Your event balance
          </Text>
          <Text style={styles.caption}>
            Expenses and recorded payments for this event only.
          </Text>
        </View>
      ) : null}
      {loading || error ? (
        <LoadState
          loading={loading}
          error={error}
          fallbackError="Could not load balances."
          onRetry={retry}
          skeleton={<BalanceSectionSkeleton />}
        />
      ) : null}
      {data ? (
        <>
          {unconvertedNote(data.unconverted_currencies) ? (
            <Text style={styles.hint}>{unconvertedNote(data.unconverted_currencies)}</Text>
          ) : null}

          <BalanceCarousel
            title="You Owe"
            empty="You don’t owe anyone money right now."
            people={owing}
            totalCents={owing.reduce((sum, person) => sum + cents(person.you_owe), 0)}
            totalTone="danger"
            paidCountFor={paidCountFor}
            onOpen={(person) => setSelectedKey(personKey(person))}
            styles={styles}
          />
          <BalanceCarousel
            title="Owes You"
            empty="Nobody owes you money right now."
            people={owed}
            totalCents={owed.reduce((sum, person) => sum + cents(person.owed_to_you), 0)}
            totalTone="success"
            paidCountFor={paidCountFor}
            onOpen={(person) => setSelectedKey(personKey(person))}
            styles={styles}
          />

          <BalanceDetailDrawer
            person={selected}
            visible={selectedKey != null}
            savedPaidIds={
              selected
                ? prunePaidIds(
                    paidByPerson[paidStorageKey(selected.user.id, selected.currency)],
                    selected.expenses.map((expense) => expense.expense_id),
                  )
                : []
            }
            balances={balances}
            onClose={() => setSelectedKey(null)}
            onRecorded={onRecorded}
            onSavePaid={onSavePaid}
            styles={styles}
          />
        </>
      ) : null}
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function BalanceCarousel({
  title,
  empty,
  people,
  totalCents,
  totalTone,
  paidCountFor,
  onOpen,
  styles,
}: {
  title: string;
  empty: string;
  people: Person[];
  totalCents: number;
  totalTone: 'danger' | 'success';
  paidCountFor: (person: Person) => number;
  onOpen: (person: Person) => void;
  styles: Styles;
}) {
  const theme = useTheme();
  const totalLabel = `$${formatCents(totalCents)}`;
  return (
    <View style={styles.group}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.subheading}>
          {title}
        </Text>
        <Text
          style={[
            styles.sectionTotal,
            {
              color:
                totalTone === 'danger' ? theme.colors.danger : theme.colors.success,
            },
          ]}
          accessibilityLabel={`${title} total ${totalLabel} CAD`}
        >
          {totalLabel}
        </Text>
      </View>
      {people.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          nestedScrollEnabled
          style={styles.carouselScroll}
          contentContainerStyle={styles.carousel}
          accessibilityRole="list"
          accessibilityLabel={title}
        >
          {people.map((person) => (
            <PersonCard
              key={`${person.user.id}:${person.currency}`}
              person={person}
              paidCount={paidCountFor(person)}
              onPress={() => onOpen(person)}
            />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>{empty}</Text>
      )}
    </View>
  );
}

function PersonCard({
  person,
  paidCount,
  onPress,
}: {
  person: Person;
  paidCount: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const name = displayName(person.user);
  const owe = cents(person.you_owe) > 0;
  const owed = cents(person.owed_to_you) > 0;
  const amount = owe ? person.you_owe : person.owed_to_you;
  const eventTitle = sharedEventTitle(person);
  const meta = metaLine(person.expenses.length, paidCount);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${money(cents(amount), person.currency)}, ${name}, ${meta}${eventTitle ? `, ${eventTitle}` : ''}. View breakdown.`}
      style={({ pressed }) => [styles.personCard, pressed && styles.personCardPressed]}
    >
      <View style={styles.personSummary}>
        <Text
          style={[
            styles.balanceAmount,
            {
              color: owe
                ? theme.colors.danger
                : owed
                  ? theme.colors.success
                  : theme.colors.textSecondary,
            },
          ]}
        >
          {money(cents(amount), person.currency)}
        </Text>
        <View style={styles.personMeta}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.eventName}>{meta}</Text>
          {eventTitle ? (
            <Text style={styles.eventName} numberOfLines={2}>
              {eventTitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function BalanceDetailDrawer({
  person,
  visible,
  savedPaidIds,
  balances,
  onClose,
  onRecorded,
  onSavePaid,
  styles,
}: {
  person: Person | null;
  visible: boolean;
  savedPaidIds: string[];
  balances: Props['balances'];
  onClose: () => void;
  onRecorded: (person: Person) => void;
  onSavePaid: (person: Person, expenseIds: string[]) => void;
  styles: Styles;
}) {
  const theme = useTheme();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const settling = useRef(false);
  const cached = useRef<Person | null>(null);
  if (person) cached.current = person;
  const active = person ?? cached.current;
  const amount = active
    ? cents(active.you_owe) > 0
      ? active.you_owe
      : active.owed_to_you
    : '0';
  const settleKey = active ? `${active.user.id}:${active.currency}` : '';

  useEffect(() => {
    if (!visible) {
      settling.current = false;
      setSaving(false);
      return;
    }
    setCheckedIds(new Set(savedPaidIds));
  }, [visible, savedPaidIds]);

  if (!active) return null;

  const name = displayName(active.user);
  const owe = cents(active.you_owe) > 0;
  const owed = cents(active.owed_to_you) > 0;
  const busy = balances.busyIds.has(settleKey);
  const eventTitle = sharedEventTitle(active);

  async function recordPayment() {
    if (settling.current || balances.busyIds.has(settleKey)) return;
    settling.current = true;
    const success = await balances.settle(active.user.id, amount, active.currency);
    settling.current = false;
    if (success) onRecorded(active);
  }

  function toggleExpense(expenseId: string, next: boolean) {
    setCheckedIds((current) => {
      const updated = new Set(current);
      if (next) updated.add(expenseId);
      else updated.delete(expenseId);
      return updated;
    });
  }

  function saveChecks() {
    setSaving(true);
    onSavePaid(active, [...checkedIds]);
    setSaving(false);
  }

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      title={money(cents(amount), active.currency)}
      subtitle={name}
      details={eventTitle ? [eventTitle] : undefined}
      accessibilityLabel={`Balance with ${name}`}
      footer={
        owe || owed ? (
          <View style={styles.footerActions}>
            <Button
              label={owe ? 'Total Amount Paid' : 'Total Amount Received'}
              variant="outline"
              shape="pill"
              size="lg"
              fullWidth
              loading={busy}
              disabled={saving}
              onPress={() => {
                void recordPayment();
              }}
              accessibilityLabel={
                owe
                  ? `Record total amount paid to ${name}`
                  : `Record total amount received from ${name}`
              }
            />
            <Button
              label="Save"
              shape="pill"
              size="lg"
              fullWidth
              loading={saving}
              disabled={busy}
              onPress={saveChecks}
              accessibilityLabel={`Save paid expenses with ${name}`}
            />
          </View>
        ) : null
      }
    >
      {owe && active.payment_contacts.length ? (
        <View style={styles.paymentSummary}>
          {active.payment_contacts.map((contact) => {
            const value = formatContact(contact.kind, contact.value);
            const label = CONTACTS[contact.kind].label;
            return (
              <View key={contact.kind} style={styles.paymentRow}>
                <Text style={[styles.hint, styles.paymentValue]} selectable>
                  {label}: {value}
                </Text>
                <CopyButton value={value} label={label} overModal />
              </View>
            );
          })}
        </View>
      ) : null}

      {active.expenses.map((expense) => {
        const share = cents(expense.amount);
        const checked = checkedIds.has(expense.expense_id);
        const dateLabel = expense.date ? formatExpenseDate(expense.date) : null;
        const inactive = busy || saving;
        return (
          <Pressable
            key={expense.expense_id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: inactive }}
            accessibilityLabel={`${expense.title}${dateLabel ? `, ${dateLabel}` : ''}, ${money(share, active.currency)}. Mark as ${owe ? 'paid' : 'received'}`}
            onPress={() => toggleExpense(expense.expense_id, !checked)}
            disabled={inactive}
            style={({ pressed }) => [
              styles.expenseRow,
              pressed && !inactive && styles.expenseRowPressed,
            ]}
          >
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Checkbox
                checked={checked}
                onChange={() => {}}
                accessibilityLabel=""
              />
            </View>
            <View style={styles.expenseBody}>
              <View style={styles.nameColumn}>
                <Text style={styles.expenseTitle}>{expense.title}</Text>
                {dateLabel ? <Text style={styles.caption}>{dateLabel}</Text> : null}
                {expense.event_title ? (
                  <Text style={styles.caption} numberOfLines={1}>
                    {expense.event_title}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: owe
                      ? theme.colors.danger
                      : owed
                        ? theme.colors.success
                        : theme.colors.textPrimary,
                  },
                ]}
              >
                {money(share, active.currency)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </BottomDrawer>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: { gap: theme.spacing[6], marginTop: theme.spacing[2] },
    eventOnlyHeader: { gap: theme.spacing[1] },
    group: { gap: 0 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing[3],
    },
    subheading: { ...theme.typography.sectionTitle, color: theme.colors.textPrimary, flex: 1 },
    sectionTotal: {
      ...theme.typography.sectionTitle,
      fontVariant: ['tabular-nums'],
    },
    carouselScroll: {
      marginTop: theme.spacing[3],
      marginHorizontal: -theme.sizes.pagePaddingX,
    },
    carousel: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing[3],
      paddingVertical: theme.spacing[1],
      paddingHorizontal: theme.sizes.pagePaddingX,
    },
    label: { ...theme.typography.button, color: theme.colors.textPrimary },
    hint: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    caption: { ...theme.typography.caption, color: theme.colors.textSecondary },
    empty: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing[1],
    },
    personCard: {
      width: theme.sizes.balanceCard,
      padding: theme.spacing[4],
      gap: theme.spacing[3],
      borderRadius: theme.radius.xl,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.bgSurface,
    },
    personCardPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    personSummary: {
      gap: theme.spacing[3],
    },
    personMeta: {
      gap: theme.spacing[0.5],
    },
    nameColumn: { flex: 1, minWidth: 100, gap: theme.spacing[1] },
    name: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
    eventName: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    balanceAmount: { ...theme.typography.h4, fontVariant: ['tabular-nums'] },
    expenseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[1],
      minHeight: theme.sizes.touchTarget,
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[2],
      marginHorizontal: -theme.spacing[2],
      borderRadius: theme.radius.md,
      borderTopWidth: theme.sizes.borderWidth,
      borderTopColor: theme.colors.borderSubtle,
    },
    expenseBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      minHeight: theme.sizes.touchTarget,
    },
    expenseRowPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    expenseTitle: { ...theme.typography.body, color: theme.colors.textPrimary },
    paymentSummary: {
      paddingVertical: theme.spacing[2],
      paddingHorizontal: theme.spacing[3] + theme.spacing[1.5],
      marginBottom: theme.spacing[2],
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgSurfaceAlt,
      gap: theme.spacing[2],
    },
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    paymentValue: {
      flex: 1,
    },
    footerActions: {
      gap: theme.spacing[2],
    },
  });
}
