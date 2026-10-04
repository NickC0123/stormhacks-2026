import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PeopleManager } from '@/components/people/PeopleManager';
import { useReceiptPicker } from '@/hooks/useReceiptPicker';
import { attachExpenseReceipt, expenseTotal, formatCents, getExpense, getExpenseReceiptUrl, listExpenseEvents, localDate, receiptExpenseFields, receiptTotalMismatch, saveExpense, type ExpenseEvent } from '@/lib/expenses';
import { scanReceipt } from '@/lib/receipts';
import { useTheme, type Theme } from '@/theme';
import type { ExpenseItem, ExpenseWrite, ItemCategory } from '@/types';

const categories: { value: ItemCategory; label: string }[] = [
  { value: 'groceries', label: 'Groceries' },
  { value: 'food_drinks', label: 'Food & Drinks' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'housing', label: 'Housing' },
  { value: 'bills_utilities', label: 'Bills & Utilities' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'health_fitness', label: 'Health & Fitness' },
  { value: 'education', label: 'Education' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
];
const itemMoneyPattern = /^-?(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const quantityPattern = /^(?:0|[1-9]\d{0,6})(?:\.\d{1,3})?$/;
const validQuantity = (quantity: ExpenseItem['quantity']) => {
  const text = String(quantity ?? 1);
  return quantityPattern.test(text) && Number(text) > 0;
};
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';

export function ExpenseEditor({ expenseId, initialEventId }: { expenseId?: string; initialEventId?: string }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [form, setForm] = useState<ExpenseWrite>({
    title: '', description: null, date: localDate(), time: null, currency: 'CAD', amount: '',
    event_id: initialEventId === 'test' ? null : initialEventId ?? null, items: [], parsed_receipt: null,
  });
  const [splitVersion, setSplitVersion] = useState(0);
  const [savedId, setSavedId] = useState(expenseId);
  const [events, setEvents] = useState<ExpenseEvent[]>([]);
  const [eventError, setEventError] = useState('');
  const [loading, setLoading] = useState(Boolean(expenseId));
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [hasReceipt, setHasReceipt] = useState(false);
  const { asset, takePhoto, chooseFromLibrary, clear } = useReceiptPicker();
  const totals = expenseTotal(form);
  const printedTotal = receiptTotalMismatch(totals, form.parsed_receipt);

  useEffect(() => {
    let active = true;
    listExpenseEvents().then((rows) => { if (active) setEvents(rows); })
      .catch((err) => { if (active) setEventError(messageOf(err)); });
    if (expenseId) {
      getExpense(expenseId).then(async (expense) => {
        if (!active) return;
        const { title, description, date, time, currency, amount, event_id, items, parsed_receipt } = expense;
        setForm({ title, description, date, time, currency, amount, event_id, items, parsed_receipt });
        setHasReceipt(Boolean(expense.receipt_image_path));
        if (expense.receipt_image_path) {
          try {
            const { url } = await getExpenseReceiptUrl(expenseId);
            if (active) setReceiptUrl(url);
          } catch (err) {
            if (active) setError(`Expense loaded, but its receipt image could not load: ${messageOf(err)}`);
          }
        }
      }).catch((err) => { if (active) setLoadError(messageOf(err)); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [expenseId]);

  function field<K extends keyof ExpenseWrite>(key: K, value: ExpenseWrite[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editItem(index: number, patch: Partial<ExpenseItem>) {
    setForm((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  }

  async function readReceipt() {
    if (!asset || busy) return;
    setBusy(true);
    setError('');
    try {
      const fields = receiptExpenseFields(await scanReceipt(asset));
      setForm((current) => ({
        ...current, ...fields,
        title: fields.title || current.title,
        date: fields.date || current.date,
        time: fields.date ? null : current.time,
      }));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  function requestScan() {
    if (form.title || form.items.length) {
      Alert.alert('Use receipt details?', 'This will populate the title, date, currency, items, tax, tip and discount. Review the results before saving.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Use receipt details', onPress: readReceipt },
      ]);
    } else void readReceipt();
  }

  async function save() {
    if (busy) return;
    if (!form.title.trim()) { setError('Enter an expense title.'); return; }
    if (!/^[A-Z]{3}$/.test(form.currency)) { setError('Enter a three-letter currency, such as CAD or CHF.'); return; }
    const date = new Date(`${form.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.date) {
      setError('Enter a valid date in YYYY-MM-DD format.'); return;
    }
    if (form.time && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(form.time)) {
      setError('Enter a time in HH:MM format, or leave it blank.'); return;
    }
    if (form.items.some((item) => !item.name.trim() || !itemMoneyPattern.test(item.amount))) {
      setError('Each item needs a name and an amount with up to two decimal places.'); return;
    }
    if (form.items.some((item) => !validQuantity(item.quantity))) {
      setError('Each item quantity must be greater than zero, with up to three decimal places.'); return;
    }
    if (!totals || totals.total < 0) { setError('The total cannot be negative. Check the item amounts.'); return; }
    setBusy(true);
    setError('');
    let currentId = savedId;
    let saved = false;
    try {
      const expense = await saveExpense({
        ...form, title: form.title.trim(), description: form.description?.trim() || null, amount: formatCents(totals.total),
      }, currentId);
      currentId = expense.id;
      setSavedId(currentId);
      setSplitVersion((version) => version + 1);
      saved = true;
      if (asset) {
        await attachExpenseReceipt(currentId, asset);
        clear();
      }
      if (expenseId !== currentId) {
        router.replace({ pathname: '/expenses/[expenseId]', params: { expenseId: currentId } });
      } else {
        setHasReceipt(Boolean(asset) || Boolean(expense.receipt_image_path));
        if (asset) {
          try {
            const { url } = await getExpenseReceiptUrl(currentId);
            setReceiptUrl(url);
          } catch (err) {
            setError(`Expense and receipt saved, but the image preview could not load: ${messageOf(err)}`);
          }
        }
        Alert.alert('Expense saved');
      }
    } catch (err) {
      setError(saved && asset
        ? `Expense saved, but the receipt could not be attached. Tap Save to retry without creating another expense. ${messageOf(err)}`
        : messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator /><Text style={styles.text}>Loading expense…</Text></View>;
  if (loadError) return <View style={styles.center}><Text style={styles.text}>{loadError}</Text><Text style={styles.text} onPress={() => router.back()}>Go back</Text></View>;

  const imageUri = asset?.uri ?? receiptUrl;
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Receipt (optional)</Text>
        <Text style={styles.hint}>Enter details below, or scan a receipt to fill them in.</Text>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" /> : null}
        {hasReceipt && !imageUri ? <Text style={styles.hint}>A receipt is attached.</Text> : null}
        <Action label="Take receipt photo" onPress={takePhoto} disabled={busy} styles={styles} />
        <Action label="Upload receipt photo" onPress={chooseFromLibrary} disabled={busy} styles={styles} />
        {asset ? <>
          <Action label="Scan and fill expense" onPress={requestScan} disabled={busy} styles={styles} />
          <Action label="Remove selected photo" onPress={clear} disabled={busy} styles={styles} />
          <Text style={styles.hint}>The selected photo will attach when you save. Scanning is optional.</Text>
        </> : null}
        {form.parsed_receipt?.warnings.map((warning, i) => <Text key={i} style={styles.warning}>{warning}</Text>)}
        <Field label="Title" value={form.title} onChangeText={(value) => field('title', value)} styles={styles} editable={!busy} />
        <Field label="Description (optional)" value={form.description ?? ''} onChangeText={(value) => field('description', value || null)} styles={styles} editable={!busy} multiline />
        <Field label="Date (YYYY-MM-DD)" value={form.date} onChangeText={(value) => field('date', value)} styles={styles} editable={!busy} />
        <Field label="Time (HH:MM, optional)" value={form.time ?? ''} onChangeText={(value) => field('time', value || null)} styles={styles} editable={!busy} />
        <Field label="Currency" value={form.currency} onChangeText={(value) => field('currency', value.toUpperCase())} styles={styles} editable={!busy} maxLength={3} />
        <Text style={styles.label}>Event (optional)</Text>
        {eventError ? <Text style={styles.warning}>Could not load events: {eventError}</Text> : null}
        {form.event_id && !events.some((event) => event.id === form.event_id) ? <Text style={styles.hint}>An event is selected. Choose an available event or No event.</Text> : null}
        <View style={styles.choices}>
          {[{ id: '', title: 'No event' }, ...events].map((event) => <Pressable
            key={event.id} disabled={busy} onPress={() => field('event_id', event.id || null)}
            accessibilityRole="radio" accessibilityState={{ selected: (form.event_id ?? '') === event.id }}
            style={[styles.choice, (form.event_id ?? '') === event.id && styles.selected]}
          ><Text style={styles.text}>{event.title}</Text></Pressable>)}
        </View>
        <Text style={styles.heading}>Equal split</Text>
        <Text style={styles.hint}>{form.event_id
          ? 'Event members are selected by default when you save. You can change the people for this expense.'
          : 'Select the people sharing this expense after saving.'} Saving expense changes updates the shares.</Text>
        {savedId ? <PeopleManager key={`${savedId}:${splitVersion}`} kind="expense" id={savedId} /> : <Text style={styles.hint}>Save this expense to add friends or invite people.</Text>}
        <Text style={styles.heading}>Items (optional)</Text>
        {form.items.map((item, index) => <View key={item.id ?? index} style={styles.item}>
          <Field label={`Item ${index + 1} name`} value={item.name} onChangeText={(name) => editItem(index, { name })} styles={styles} editable={!busy} />
          <View style={styles.itemRow}>
            <View style={styles.quantity}>
              <Field label="Quantity" accessibilityLabel={`Item ${index + 1} quantity`} value={String(item.quantity ?? 1)} onChangeText={(quantity) => editItem(index, { quantity, unit_price: null })} styles={styles} editable={!busy} keyboardType="decimal-pad" />
            </View>
            <View style={styles.amount}>
              <Field label="Item amount" accessibilityLabel={`Item ${index + 1} amount`} value={item.amount} onChangeText={(amount) => editItem(index, { amount, unit_price: null })} styles={styles} editable={!busy} keyboardType="decimal-pad" />
            </View>
          </View>
          <Text style={styles.label}>Category</Text>
          <View style={styles.choices}>{categories.map(({ value, label }) => <Pressable
            key={value} disabled={busy} onPress={() => editItem(index, { category: value })}
            accessibilityRole="radio" accessibilityState={{ selected: item.category === value }}
            style={[styles.choice, item.category === value && styles.selected]}
          ><Text style={styles.text}>{label}</Text></Pressable>)}</View>
          <Action label="Remove item" onPress={() => field('items', form.items.filter((_, i) => i !== index))} disabled={busy} styles={styles} />
        </View>)}
        <Action label="Add item" onPress={() => field('items', [...form.items, { name: '', category: 'other', amount: '', quantity: '1' }])} disabled={busy} styles={styles} />
        <Text style={styles.heading}>Overall amount</Text>
        {totals ? <View style={styles.summary}>
          <SummaryRow label="Items" value={formatCents(totals.subtotal)} styles={styles} />
          {totals.discount ? <SummaryRow label="Discount" value={formatCents(-totals.discount)} styles={styles} /> : null}
          {totals.tax ? <SummaryRow label="Tax" value={formatCents(totals.tax)} styles={styles} /> : null}
          {totals.tip ? <SummaryRow label="Tip" value={formatCents(totals.tip)} styles={styles} /> : null}
          <SummaryRow label={`Total (${form.currency || 'CAD'})`} value={formatCents(totals.total)} styles={styles} total />
        </View> : <Text style={styles.hint}>Fix the item amounts to see the total.</Text>}
        {totals && printedTotal !== null ? <Text style={styles.warning} accessibilityRole="alert">
          Total mismatch: the receipt total is {formatCents(printedTotal)}, but the items, discount, tax and tip add up to {formatCents(totals.total)}. Check the items before saving.
        </Text> : null}
        {!form.items.length ? <Text style={styles.hint}>The total is calculated from the items. Add an item to set it.</Text> : null}
        {error ? <Text style={styles.warning}>{error}</Text> : null}
        {busy ? <ActivityIndicator /> : null}
        <Action label="Save expense" onPress={save} disabled={busy} styles={styles} primary />
      </ScrollView>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;
function Field({ label, styles, ...props }: React.ComponentProps<typeof TextInput> & { label: string; styles: Styles }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} {...props} style={styles.input} /></View>;
}
function SummaryRow({ label, value, styles, total }: { label: string; value: string; styles: Styles; total?: boolean }) {
  return <View style={styles.summaryRow} accessible accessibilityLabel={`${label}: ${value}`}>
    <Text style={total ? styles.totalText : styles.text}>{label}</Text>
    <Text style={total ? styles.totalText : styles.text}>{value}</Text>
  </View>;
}
function Action({ label, onPress, disabled, styles, primary }: { label: string; onPress: () => void; disabled?: boolean; styles: Styles; primary?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, primary && styles.primary, disabled && { opacity: 0.5 }]}>
    <Text style={[styles.text, primary && styles.primaryText]}>{label}</Text>
  </Pressable>;
}
function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bgPage },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: theme.colors.bgPage },
    content: { padding: 20, gap: 12, paddingBottom: 40 },
    heading: { ...theme.typography.h2, color: theme.colors.textPrimary, marginTop: 12 },
    text: { ...theme.typography.body, color: theme.colors.textPrimary },
    hint: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    label: { ...theme.typography.bodySm, color: theme.colors.textPrimary },
    field: { gap: 6 },
    input: { borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: 10, padding: 12, color: theme.colors.textPrimary, fontSize: 16 },
    button: { minHeight: 46, justifyContent: 'center', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: theme.colors.accentStrong, borderRadius: 10 },
    primary: { backgroundColor: theme.colors.accent },
    primaryText: { color: theme.colors.onAccent },
    preview: { width: '100%', height: 220, borderRadius: 10 },
    warning: { color: theme.colors.textPrimary, backgroundColor: theme.colors.accentSubtle, padding: 12, borderRadius: 8 },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.borderSubtle },
    selected: { borderColor: theme.colors.accentStrong, backgroundColor: theme.colors.accentSubtle },
    item: { borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: 10, padding: 12, gap: 10 },
    itemRow: { flexDirection: 'row', gap: theme.spacing[3] },
    quantity: { flex: 1 },
    amount: { flex: 2 },
    summary: { gap: theme.spacing[2], padding: theme.spacing[3], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bgSurfaceAlt },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing[3] },
    totalText: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
  });
}
