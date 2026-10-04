import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
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

type PickerMode = 'date' | 'time';

/** Parse `YYYY-MM-DD` as a local calendar date. */
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a Date as `YYYY-MM-DD` in local time. */
function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Parse optional `HH:MM` / `HH:MM:SS` into today's date with that wall-clock time. */
function parseLocalTime(value: string | null): Date | null {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value);
  if (!match) return null;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  return date;
}

/** Format a Date as `HH:MM`. */
function toLocalTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateLabel(value: string): string {
  const date = parseLocalDate(value);
  if (!date) return 'Choose date';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabel(value: string | null): string {
  const date = parseLocalTime(value);
  if (!date) return 'Add time';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * iOS date/time sheet — slides up with native-driver motion (same curve as create modal).
 * Avoids inline ScrollView height animation, which always feels choppy.
 */
function DateTimePickerSheet({
  visible,
  mode,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  mode: PickerMode;
  value: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const styles = createPickerSheetStyles(theme);
  const progress = useRef(new Animated.Value(0)).current;
  const wasOpen = useRef(false);
  const closingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const [x1, y1, x2, y2] = theme.motion.easeTab;
    const easing = Easing.bezier(x1, y1, x2, y2);

    if (visible) {
      wasOpen.current = true;
      closingRef.current = false;
      setMounted(true);

      if (reduceMotion) {
        progress.setValue(1);
        return;
      }

      progress.setValue(0);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: theme.motion.modal.openDur,
        easing,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }

    if (!wasOpen.current) return;

    if (reduceMotion) {
      progress.setValue(0);
      wasOpen.current = false;
      closingRef.current = false;
      setMounted(false);
      return;
    }

    closingRef.current = true;
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: theme.motion.modal.closeDur,
      easing,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      wasOpen.current = false;
      closingRef.current = false;
      setMounted(false);
    });
    return () => anim.stop();
  }, [visible, reduceMotion, theme, progress]);

  function requestClose() {
    if (closingRef.current || !wasOpen.current) return;
    onClose();
  }

  if (!mounted) return null;

  const sheetTravel = theme.sizes.dateTimePicker + theme.sizes.touchTarget + theme.spacing[8];

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={requestClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]} pointerEvents="none" />
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={requestClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetTravel, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{mode === 'date' ? 'Date' : 'Time'}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={requestClose}
              style={({ pressed }) => [styles.sheetDone, pressed && styles.sheetDonePressed]}
            >
              <Text style={styles.sheetDoneText}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            onChange={onChange}
            themeVariant={theme.scheme === 'dark' ? 'dark' : 'light'}
            accentColor={theme.colors.accent}
            style={styles.pickerControl}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

function createPickerSheetStyles(theme: Theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      // Match create-action overlay tone.
      backgroundColor: 'rgba(41, 41, 58, 0.23)',
    },
    sheet: {
      backgroundColor: theme.colors.navBar,
      borderTopLeftRadius: theme.radius.sheet,
      borderTopRightRadius: theme.radius.sheet,
      paddingBottom: theme.spacing[6],
      paddingHorizontal: theme.spacing[4],
      ...theme.shadows.nav,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: theme.sizes.touchTarget,
      paddingTop: theme.spacing[3],
    },
    sheetTitle: {
      ...theme.typography.body,
      fontFamily: theme.fonts.sans.semibold,
      color: theme.colors.textPrimary,
    },
    sheetDone: {
      minHeight: theme.sizes.touchTarget,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[2],
    },
    sheetDonePressed: {
      opacity: 0.7,
    },
    sheetDoneText: {
      ...theme.typography.body,
      fontFamily: theme.fonts.sans.semibold,
      color: theme.colors.accentStrong,
    },
    pickerControl: {
      height: theme.sizes.dateTimePicker,
      alignSelf: 'stretch',
    },
  });
}

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
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  /** Drawer create flow: details first, receipt/items later. */
  const [step, setStep] = useState<1 | 2>(1);
  const [manualEntry, setManualEntry] = useState(false);
  const { asset, takePhoto, chooseFromLibrary, clear } = useReceiptPicker();
  const totals = expenseTotal(form);
  const printedTotal = receiptTotalMismatch(totals, form.parsed_receipt);
  const totalSteps = 2;

  function openReceiptPicker() {
    if (busy) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) void takePhoto();
          if (index === 2) void chooseFromLibrary();
        },
      );
      return;
    }
    Alert.alert('Add receipt', 'Capture a new photo or choose one from your library.', [
      { text: 'Take Photo', onPress: () => void takePhoto() },
      { text: 'Choose from Library', onPress: () => void chooseFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !selected) return;
    if (pickerMode === 'date') field('date', toLocalDateString(selected));
    if (pickerMode === 'time') field('time', toLocalTimeString(selected));
  }

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

  function startManualEntry() {
    setManualEntry(true);
    if (form.items.length === 0) {
      field('items', [{ name: '', category: 'other', amount: '', quantity: '1' }]);
    }
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
      // Show the parsed line items (drawer hides the item list until manual/scan mode).
      setManualEntry(true);
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

  function validateStep1(): boolean {
    if (!form.title.trim()) { setError('Enter an expense title.'); return false; }
    const date = new Date(`${form.date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.date) {
      setError('Enter a valid date in YYYY-MM-DD format.'); return false;
    }
    if (form.time && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(form.time)) {
      setError('Enter a time in HH:MM format, or leave it blank.'); return false;
    }
    setError('');
    return true;
  }

  function continueToStep2() {
    if (!validateStep1()) return;
    setStep(2);
  }

  async function save() {
    if (busy) return;
    if (!validateStep1()) return;
    if (!/^[A-Z]{3}$/.test(form.currency)) { setError('Enter a three-letter currency, such as CAD or CHF.'); return; }
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

  const isDrawer = !expenseId;
  const showStep1 = !isDrawer || step === 1;
  const showStep2 = !isDrawer || step === 2;
  const imageUri = asset?.uri ?? receiptUrl;
  const canContinue = form.title.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={isDrawer ? ['bottom'] : ['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, isDrawer && styles.drawerContent]}
        keyboardShouldPersistTaps="handled"
      >
        {isDrawer ? (
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.pageTitle} accessibilityRole="header">
                Add Expense
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={theme.spacing[2]}
                onPress={() => router.back()}
                style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
              >
                <SFSymbolIcon name="xmark" color={theme.colors.textPrimary} />
              </Pressable>
            </View>
            <View
              style={styles.progressRow}
              accessibilityRole="progressbar"
              accessibilityLabel="Expense form progress"
              accessibilityValue={{ min: 1, max: totalSteps, now: step }}
            >
              {Array.from({ length: totalSteps }, (_, index) => {
                const active = step > index;
                return (
                  <View
                    key={index}
                    style={[styles.progressSegment, active && styles.progressSegmentActive]}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {showStep1 ? (
          <>
            <Field label="Title" value={form.title} onChangeText={(value) => field('title', value)} styles={styles} editable={!busy} />
            <Field label="Description (optional)" value={form.description ?? ''} onChangeText={(value) => field('description', value || null)} styles={styles} editable={!busy} multiline />
            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Date"
                accessibilityHint="Opens the date picker"
                disabled={busy}
                onPress={() => setPickerMode('date')}
                style={({ pressed }) => [styles.input, styles.pickerButton, pressed && !busy && styles.pickerPressed, busy && styles.pickerDisabled]}
              >
                <Text style={styles.text}>{formatDateLabel(form.date)}</Text>
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Time (optional)</Text>
              <View style={[styles.input, styles.timeField, busy && styles.pickerDisabled]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Time"
                  accessibilityHint="Opens the time picker"
                  disabled={busy}
                  onPress={() => {
                    if (!form.time) field('time', toLocalTimeString(new Date()));
                    setPickerMode('time');
                  }}
                  style={({ pressed }) => [
                    styles.timeButton,
                    pressed && !busy && styles.pickerPressed,
                  ]}
                >
                  <Text style={[styles.text, !form.time && styles.pickerPlaceholder]}>{formatTimeLabel(form.time)}</Text>
                </Pressable>
                {form.time ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear time"
                    disabled={busy}
                    hitSlop={theme.spacing[2]}
                    onPress={() => {
                      setPickerMode(null);
                      field('time', null);
                    }}
                    style={({ pressed }) => [styles.clearTime, pressed && !busy && styles.pickerPressed]}
                  >
                    <Text style={styles.clearTimeText}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
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
          </>
        ) : null}

        {/* Drawer step 2 + edit flow: money, receipt dropzone, optional manual items. */}
        {showStep2 ? (
          <>
            <Field label="Currency" value={form.currency} onChangeText={(value) => field('currency', value.toUpperCase())} styles={styles} editable={!busy} maxLength={3} />
            <Text style={styles.sectionLabel}>Items</Text>
            {manualEntry || !isDrawer ? (
              <>
                {form.items.map((item, index) => (
                  <View key={item.id ?? index} style={styles.item}>
                    <Field label={`Item ${index + 1} name`} value={item.name} onChangeText={(name) => editItem(index, { name })} styles={styles} editable={!busy} />
                    <View style={styles.itemRow}>
                      <View style={styles.quantity}>
                        <Field
                          label="Quantity"
                          accessibilityLabel={`Item ${index + 1} quantity`}
                          value={String(item.quantity ?? 1)}
                          onChangeText={(quantity) => editItem(index, { quantity, unit_price: null })}
                          styles={styles}
                          editable={!busy}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={styles.amount}>
                        <Field
                          label="Item amount"
                          accessibilityLabel={`Item ${index + 1} amount`}
                          value={item.amount}
                          onChangeText={(amount) => editItem(index, { amount, unit_price: null })}
                          styles={styles}
                          editable={!busy}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.choices}>{categories.map(({ value, label }) => <Pressable
                      key={value} disabled={busy} onPress={() => editItem(index, { category: value })}
                      accessibilityRole="radio" accessibilityState={{ selected: item.category === value }}
                      style={[styles.choice, item.category === value && styles.selected]}
                    ><Text style={styles.text}>{label}</Text></Pressable>)}</View>
                    <Action label="Remove item" onPress={() => field('items', form.items.filter((_, i) => i !== index))} disabled={busy} styles={styles} />
                  </View>
                ))}
                <Action
                  label="Add individual item"
                  onPress={() => {
                    setManualEntry(true);
                    field('items', [...form.items, { name: '', category: 'other', amount: '', quantity: '1' }]);
                  }}
                  disabled={busy}
                  styles={styles}
                />
                <Text style={styles.sectionLabel}>Overall amount</Text>
                {totals ? (
                  <View style={styles.summary}>
                    <SummaryRow label="Items" value={formatCents(totals.subtotal)} styles={styles} />
                    {totals.discount ? <SummaryRow label="Discount" value={formatCents(-totals.discount)} styles={styles} /> : null}
                    {totals.tax ? <SummaryRow label="Tax" value={formatCents(totals.tax)} styles={styles} /> : null}
                    {totals.tip ? <SummaryRow label="Tip" value={formatCents(totals.tip)} styles={styles} /> : null}
                    <SummaryRow label={`Total (${form.currency || 'CAD'})`} value={formatCents(totals.total)} styles={styles} total />
                  </View>
                ) : (
                  <Text style={styles.hint}>Fix the item amounts to see the total.</Text>
                )}
                {totals && printedTotal !== null ? (
                  <Text style={styles.warning} accessibilityRole="alert">
                    Total mismatch: the receipt total is {formatCents(printedTotal)}, but the items, discount, tax and tip add up to {formatCents(totals.total)}. Check the items before saving.
                  </Text>
                ) : null}
                {!form.items.length ? <Text style={styles.hint}>The total is calculated from the items. Add an item to set it.</Text> : null}
                {isDrawer ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Use receipt photo instead"
                    disabled={busy}
                    onPress={() => setManualEntry(false)}
                    style={({ pressed }) => [styles.flatButton, pressed && !busy && styles.pickerPressed]}
                  >
                    <Text style={styles.flatButtonText}>Use receipt photo instead</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add your items"
                  accessibilityHint="Take a photo or choose one from your library"
                  disabled={busy}
                  onPress={openReceiptPicker}
                  style={({ pressed }) => [
                    styles.dropzone,
                    pressed && !busy && styles.dropzonePressed,
                    busy && styles.pickerDisabled,
                  ]}
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.dropzonePreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.dropzoneContent}>
                      <SFSymbolIcon
                        name="square.and.arrow.up"
                        size={theme.sizes.dropzoneIcon}
                        color={theme.colors.textPlaceholder}
                      />
                      <Text style={styles.dropzoneTitle}>Add Your Items</Text>
                      <Text style={styles.dropzoneCaption}>
                        Capture or upload a photo of your receipt and we'll fill in the items.
                      </Text>
                    </View>
                  )}
                </Pressable>
                {hasReceipt && !imageUri ? <Text style={styles.hint}>A receipt is attached.</Text> : null}
                {asset ? (
                  <View style={styles.dropzoneActions}>
                    <Action label="Scan and fill expense" onPress={requestScan} disabled={busy} styles={styles} />
                    <Action
                      label="Remove selected photo"
                      onPress={() => {
                        clear();
                      }}
                      disabled={busy}
                      styles={styles}
                    />
                  </View>
                ) : null}
                {form.parsed_receipt?.warnings.map((warning, i) => <Text key={i} style={styles.warning}>{warning}</Text>)}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Enter manually"
                  disabled={busy}
                  onPress={startManualEntry}
                  style={({ pressed }) => [styles.flatButton, pressed && !busy && styles.pickerPressed]}
                >
                  <Text style={styles.flatButtonText}>Enter Manually</Text>
                </Pressable>
              </>
            )}
          </>
        ) : null}

        {error ? <Text style={styles.warning}>{error}</Text> : null}
        {busy ? <ActivityIndicator color={theme.colors.accent} /> : null}

        {isDrawer && step === 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !canContinue || busy }}
            disabled={!canContinue || busy}
            onPress={continueToStep2}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && canContinue && styles.primaryCtaPressed,
              (!canContinue || busy) && styles.primaryCtaDisabled,
            ]}
          >
            <Text style={styles.primaryCtaText}>Continue</Text>
          </Pressable>
        ) : isDrawer && step === 2 ? (
          <View style={styles.ctaRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              disabled={busy}
              onPress={() => setStep(1)}
              style={({ pressed }) => [
                styles.primaryCta,
                styles.ctaHalf,
                styles.ctaRowPrimary,
                pressed && !busy && styles.primaryCtaPressed,
                busy && styles.primaryCtaDisabled,
              ]}
            >
              <Text style={styles.primaryCtaText}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save expense"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={save}
              style={({ pressed }) => [
                styles.primaryCta,
                styles.ctaHalf,
                styles.ctaRowPrimary,
                pressed && !busy && styles.primaryCtaPressed,
                busy && styles.primaryCtaDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.onAccent} />
              ) : (
                <Text style={styles.primaryCtaText}>Save</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save expense"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={save}
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && !busy && styles.primaryCtaPressed,
              busy && styles.primaryCtaDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={theme.colors.onAccent} />
            ) : (
              <Text style={styles.primaryCtaText}>Save expense</Text>
            )}
          </Pressable>
        )}
      </ScrollView>

      {Platform.OS === 'android' && pickerMode ? (
        <DateTimePicker
          value={
            pickerMode === 'date'
              ? (parseLocalDate(form.date) ?? new Date())
              : (parseLocalTime(form.time) ?? new Date())
          }
          mode={pickerMode}
          display="default"
          onChange={onPickerChange}
          themeVariant={theme.scheme === 'dark' ? 'dark' : 'light'}
          accentColor={theme.colors.accent}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <DateTimePickerSheet
          visible={pickerMode !== null}
          mode={pickerMode ?? 'date'}
          value={
            pickerMode === 'time'
              ? (parseLocalTime(form.time) ?? new Date())
              : (parseLocalDate(form.date) ?? new Date())
          }
          onChange={onPickerChange}
          onClose={() => setPickerMode(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;
function Field({ label, styles, ...props }: React.ComponentProps<typeof TextInput> & { label: string; styles: Styles }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} {...props} style={styles.input} /></View>;
}
function SummaryRow({ label, value, styles, total }: { label: string; value: string; styles: Styles; total?: boolean }) {
  return (
    <View style={styles.summaryRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={total ? styles.totalText : styles.text}>{label}</Text>
      <Text style={total ? styles.totalText : styles.text}>{value}</Text>
    </View>
  );
}
function Action({ label, onPress, disabled, styles, primary }: { label: string; onPress: () => void; disabled?: boolean; styles: Styles; primary?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, primary && styles.primary, disabled && { opacity: 0.5 }]}>
    <Text style={[styles.text, primary && styles.primaryText]}>{label}</Text>
  </Pressable>;
}
function createStyles(theme: Theme) {
  const m = theme.createActionModal;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bgSurface },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: theme.colors.bgSurface },
    content: { padding: 20, gap: 12, paddingBottom: 40 },
    drawerContent: {
      paddingHorizontal: theme.spacing[9], // 36 — match Add Event drawer
      paddingTop: theme.spacing[12], // 48
      paddingBottom: theme.spacing[9],
      gap: theme.spacing[3],
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      marginTop: theme.spacing[8],
    },
    ctaHalf: {
      flex: 1,
    },
    ctaRowPrimary: {
      marginTop: 0,
    },
    primaryCta: {
      height: m.actionHeight,
      marginTop: theme.spacing[8],
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.accent,
    },
    primaryCtaPressed: {
      backgroundColor: theme.colors.accentActive,
    },
    primaryCtaDisabled: {
      opacity: theme.opacity.disabled,
    },
    primaryCtaText: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.onAccent,
      textAlign: 'center',
    },
    sectionLabel: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.48,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing[2],
    },
    dropzone: {
      height: theme.sizes.receiptDropzone,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bgSurface,
    },
    dropzonePressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    dropzoneContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[2],
      paddingHorizontal: theme.spacing[6],
    },
    dropzoneTitle: {
      fontFamily: theme.fonts.sans.semibold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.48,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    dropzoneCaption: {
      fontFamily: theme.fonts.sans.regular,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: -0.42,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    dropzonePreview: {
      width: '100%',
      height: '100%',
    },
    dropzoneActions: {
      gap: theme.spacing[3],
    },
    flatButton: {
      alignSelf: 'center',
      minHeight: theme.sizes.touchTarget,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[3],
    },
    flatButtonText: {
      fontFamily: theme.fonts.sans.semibold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.48,
      color: theme.colors.accent,
      textAlign: 'center',
    },
    header: {
      gap: theme.spacing[4],
      marginBottom: theme.spacing[5],
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    closeButton: {
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closePressed: {
      opacity: 0.7,
    },
    pageTitle: {
      ...theme.typography.h2,
      fontFamily: theme.fonts.sans.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'left',
      flex: 1,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    progressSegment: {
      flex: 1,
      height: theme.sizes.progressBar,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.borderSubtle,
    },
    progressSegmentActive: {
      backgroundColor: theme.colors.accent,
    },
    heading: { ...theme.typography.h2, color: theme.colors.textPrimary, marginTop: 12 },
    text: { ...theme.typography.body, color: theme.colors.textPrimary },
    hint: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    label: { ...theme.typography.bodySm, color: theme.colors.textPrimary },
    field: { gap: theme.spacing[1.5] },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.lg,
      padding: theme.spacing[3],
      color: theme.colors.textPrimary,
      fontSize: 16,
    },
    pickerButton: {
      minHeight: theme.sizes.touchTarget,
      justifyContent: 'center',
    },
    pickerPressed: {
      opacity: 0.85,
    },
    pickerDisabled: {
      opacity: theme.opacity.disabled,
    },
    pickerPlaceholder: {
      color: theme.colors.textPlaceholder,
    },
    timeField: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: theme.sizes.touchTarget,
      paddingVertical: 0,
      gap: theme.spacing[2],
    },
    timeButton: {
      flex: 1,
      minHeight: theme.sizes.touchTarget,
      justifyContent: 'center',
    },
    clearTime: {
      minHeight: theme.sizes.touchTarget,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[1],
    },
    clearTimeText: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
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
    summary: {
      gap: theme.spacing[2],
      padding: theme.spacing[3],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing[3] },
    totalText: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
  });
}
