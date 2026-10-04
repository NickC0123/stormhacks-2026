import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, Stack } from 'expo-router';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PeopleManager } from '@/components/people/PeopleManager';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { InlineSnackbar, useSnackbar } from '@/components/ui/Snackbar';
import { useReceiptPicker } from '@/hooks/useReceiptPicker';
import { attachExpenseReceipt, categoryLabels, deleteExpense, expenseTotal, formatCents, getExpense, itemUnitPrice, lineAmount, getExpenseReceiptUrl, listExpenseEvents, localDate, receiptExpenseFields, receiptTotalMismatch, saveExpense, type ExpenseEvent } from '@/lib/expenses';
import { scanReceipt } from '@/lib/receipts';
import { useTheme, type Theme } from '@/theme';
import type { ExpenseItem, ExpenseWrite, ItemCategory } from '@/types';

const categories = (Object.keys(categoryLabels) as ItemCategory[]).map((value) => ({ value, label: categoryLabels[value] }));
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
      width: '100%',
      height: theme.sizes.dateTimePicker,
      alignSelf: 'center',
    },
  });
}

export function ExpenseEditor({ expenseId, initialEventId }: { expenseId?: string; initialEventId?: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();
  const styles = createStyles(theme);
  // Match floating bottom nav: sit just above the home indicator (min 12).
  const bottomPad = Math.max(insets.bottom, theme.spacing[3]);
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
  const [scanToast, setScanToast] = useState<string | null>(null);
  const { asset, takePhoto, chooseFromLibrary, clear } = useReceiptPicker();
  const totals = expenseTotal(form);
  const printedTotal = receiptTotalMismatch(totals, form.parsed_receipt);
  const totalSteps = 2;

  function openReceiptPicker(options?: { scanAfter?: boolean }) {
    if (busy) return;
    const afterPick = async (pick: () => Promise<Awaited<ReturnType<typeof takePhoto>>>) => {
      const next = await pick();
      if (options?.scanAfter && next) await readReceipt(next);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) void afterPick(takePhoto);
          if (index === 2) void afterPick(chooseFromLibrary);
        },
      );
      return;
    }
    Alert.alert('Add receipt', 'Capture a new photo or choose one from your library.', [
      { text: 'Take Photo', onPress: () => void afterPick(takePhoto) },
      { text: 'Choose from Library', onPress: () => void afterPick(chooseFromLibrary) },
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
      field('items', [{ name: '', category: 'other', amount: '', quantity: '' }]);
    }
  }

  function editItem(index: number, patch: Partial<ExpenseItem>) {
    setForm((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  }

  /** Editing price or quantity keeps the line total equal to price × quantity. */
  function editPricing(index: number, patch: { unit_price?: string; quantity?: string }) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, i) => {
        if (i !== index) return item;
        const unitPrice = patch.unit_price ?? itemUnitPrice(item);
        const quantity = patch.quantity ?? item.quantity;
        return { ...item, quantity, unit_price: unitPrice, amount: lineAmount(unitPrice, quantity) };
      }),
    }));
  }

  async function readReceipt(source = asset) {
    if (!source || busy) return;
    setBusy(true);
    setError('');
    try {
      const fields = receiptExpenseFields(await scanReceipt(source));
      setForm((current) => {
        // Keep filled rows; drop blank manual placeholders before appending scan results.
        const existing = current.items.filter(
          (item) => item.name.trim() || item.amount.trim() || String(item.quantity ?? '').trim() !== '',
        );
        return {
          ...current,
          ...fields,
          title: fields.title || current.title,
          date: fields.date || current.date,
          time: fields.date ? null : current.time,
          items: [...existing, ...fields.items],
        };
      });
      // Show the parsed line items (drawer hides the item list until manual/scan mode).
      setManualEntry(true);
      // In-drawer toast — root snackbars sit under the native expense modal.
      setScanToast('Receipt scanned successfully.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  function requestScan() {
    void readReceipt();
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

  function hasEnteredItems() {
    // Empty "Enter manually" rows don't count — only real input or a receipt.
    const hasFilledItem = form.items.some(
      (item) => item.name.trim() || item.amount.trim() || String(item.quantity ?? '').trim() !== '',
    );
    return hasFilledItem || Boolean(asset) || Boolean(form.parsed_receipt);
  }

  /** Warn before leaving step 2 / closing when item work would be lost. */
  function confirmDiscardItems(onDiscard: () => void) {
    if (!hasEnteredItems()) {
      onDiscard();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'If you leave now, you’ll lose the items you’ve entered.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onDiscard },
      ],
    );
  }

  function discardItemsAndGoToStep1() {
    field('items', []);
    field('parsed_receipt', null);
    setManualEntry(false);
    clear();
    setStep(1);
  }

  async function save() {
    if (busy) return;
    if (!validateStep1()) return;
    if (!/^[A-Z]{3}$/.test(form.currency)) { setError('Enter a three-letter currency, such as CAD or CHF.'); return; }
    if (form.items.some((item) => (
      !item.name.trim()
      || !itemMoneyPattern.test(item.amount)
      || (item.unit_price != null && !itemMoneyPattern.test(item.unit_price))
    ))) {
      setError('Each item needs a name and a price with up to two decimal places.'); return;
    }
    if (form.items.some((item) => !validQuantity(item.quantity))) {
      setError('Each item quantity must be greater than zero, with up to three decimal places.'); return;
    }
    if (!totals || totals.total === 0) { setError('Add at least one item before saving.'); return; }
    if (totals.total < 0) { setError('The total cannot be negative. Check the item amounts.'); return; }
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
      const created = !expenseId;
      router.back();
      // Wait for the modal dismiss so the toast doesn't play under the closing drawer.
      setTimeout(() => {
        showSnackbar({
          message: created ? 'Expense created successfully.' : 'Expense saved successfully.',
          variant: 'success',
        });
      }, theme.motion.modal.closeDur + theme.motion.duration.fast);
    } catch (err) {
      setError(saved && asset
        ? `Expense saved, but the receipt could not be attached. Tap Save to retry without creating another expense. ${messageOf(err)}`
        : messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (busy || !savedId) return;
    Alert.alert(
      'Delete expense?',
      'This removes the expense for everyone on it, and balances will update. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove(savedId) },
      ],
    );
  }

  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      await deleteExpense(id);
      router.back();
      setTimeout(() => {
        showSnackbar({ message: 'Expense deleted.', variant: 'success' });
      }, theme.motion.modal.closeDur + theme.motion.duration.fast);
    } catch (err) {
      setError(`Could not delete the expense. ${messageOf(err)}`);
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
  const canSave = Boolean(totals && totals.total !== 0);

  return (
    <SafeAreaView style={styles.container} edges={isDrawer ? [] : ['left', 'right']}>
      {isDrawer ? null : (
        <Stack.Screen
          options={{
            headerRight: () => (
              <Pressable
                onPress={confirmDelete}
                disabled={busy}
                hitSlop={theme.spacing[2]}
                accessibilityRole="button"
                accessibilityLabel="Delete expense"
                style={({ pressed }) => (pressed || busy) && styles.primaryCtaDisabled}
              >
                <SFSymbolIcon name="trash" size={22} color={theme.colors.danger} />
              </Pressable>
            ),
          }}
        />
      )}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isDrawer && styles.drawerContent,
          isDrawer && styles.drawerContentGrow,
          { paddingBottom: bottomPad },
        ]}
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
                onPress={() => confirmDiscardItems(() => router.back())}
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
            <View style={styles.field}>
              <Text style={styles.label}>Event (optional)</Text>
              {eventError ? <Text style={styles.warning}>Could not load events: {eventError}</Text> : null}
              {form.event_id && !events.some((event) => event.id === form.event_id) ? (
                <Text style={styles.hint}>An event is selected. Choose an available event or No event.</Text>
              ) : null}
              <NativeSelect
                value={form.event_id ?? ''}
                options={[
                  { value: '', label: 'No event' },
                  ...events.map((event) => ({ value: event.id, label: event.title })),
                  ...(form.event_id && !events.some((event) => event.id === form.event_id)
                    ? [{ value: form.event_id, label: 'Selected event' }]
                    : []),
                ]}
                disabled={busy}
                placeholder="No event"
                title="Event"
                accessibilityLabel="Event"
                onChange={(eventId) => field('event_id', eventId || null)}
              />
            </View>
            {!isDrawer ? (
              <>
                <Text style={styles.sectionLabel}>Equal split</Text>
                <Text style={styles.hint}>
                  {form.event_id
                    ? 'Event members are selected by default when you save. You can change the people for this expense.'
                    : 'Select the people sharing this expense after saving.'}{' '}
                  Saving expense changes updates the shares.
                </Text>
                {savedId ? (
                  <PeopleManager key={`${savedId}:${splitVersion}`} kind="expense" id={savedId} />
                ) : (
                  <Text style={styles.hint}>Save this expense to add friends or invite people.</Text>
                )}
              </>
            ) : null}
          </>
        ) : null}

        {/* Drawer step 2 + edit flow: money, receipt dropzone, optional manual items. */}
        {showStep2 ? (
          <>
            <Field label="Currency" value={form.currency} onChangeText={(value) => field('currency', value.toUpperCase())} styles={styles} editable={!busy} maxLength={3} />
            <Text style={styles.sectionLabel}>Items</Text>
            {manualEntry || !isDrawer ? (
              <>
                {form.items.map((item, index) => {
                  const categoryLabel = categories.find((category) => category.value === item.category)?.label ?? 'Category';
                  const quantityValue = item.quantity === undefined || item.quantity === null ? '' : String(item.quantity);
                  const unitPrice = itemUnitPrice(item);
                  const showLineTotal = Boolean(item.amount) && quantityValue !== '' && Number(quantityValue) !== 1;
                  return (
                    <View key={item.id ?? index} style={styles.item}>
                      <View style={styles.itemHeader}>
                        <TextInput
                          accessibilityLabel={`Item ${index + 1} name`}
                          value={item.name}
                          onChangeText={(name) => editItem(index, { name })}
                          editable={!busy}
                          placeholder="Enter item name"
                          placeholderTextColor={theme.colors.textTertiary}
                          style={styles.itemName}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove item ${index + 1}`}
                          disabled={busy}
                          hitSlop={theme.spacing[2]}
                          onPress={() => {
                            const nextItems = form.items.filter((_, i) => i !== index);
                            field('items', nextItems);
                            // Last item gone in the drawer → back to receipt dropzone (hides overall amount too).
                            if (isDrawer && nextItems.length === 0) {
                              setManualEntry(false);
                              clear();
                              field('parsed_receipt', null);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.itemRemove,
                            pressed && !busy && styles.itemRemovePressed,
                            busy && styles.pickerDisabled,
                          ]}
                        >
                          <SFSymbolIcon name="trash" size={theme.sizes.iconMd} color={theme.colors.danger} />
                        </Pressable>
                      </View>
                      <View style={styles.itemBody}>
                        <View style={styles.itemRow}>
                          <View style={styles.quantityControl}>
                            <TextInput
                              accessibilityLabel={`Item ${index + 1} quantity`}
                              value={quantityValue}
                              onChangeText={(quantity) => editPricing(index, { quantity })}
                              editable={!busy}
                              keyboardType="decimal-pad"
                              placeholder="Qty"
                              placeholderTextColor={theme.colors.textTertiary}
                              style={styles.quantityInput}
                            />
                          </View>
                          <View style={styles.amountControl}>
                            <Text
                              style={[styles.amountPrefix, !unitPrice && styles.amountPrefixPlaceholder]}
                              accessibilityElementsHidden
                              importantForAccessibility="no"
                            >
                              $
                            </Text>
                            <TextInput
                              accessibilityLabel={`Item ${index + 1} price each`}
                              value={unitPrice}
                              onChangeText={(price) => editPricing(index, { unit_price: price })}
                              editable={!busy}
                              keyboardType="decimal-pad"
                              placeholder="0.00 each"
                              placeholderTextColor={theme.colors.textTertiary}
                              style={styles.amountInput}
                            />
                          </View>
                        </View>
                        {showLineTotal ? (
                          <Text style={styles.lineTotal}>
                            {quantityValue} × {unitPrice} = {item.amount}
                          </Text>
                        ) : null}
                        <NativeSelect
                          value={
                            item.category === 'other' && !item.name.trim() && !item.amount && !quantityValue
                              ? null
                              : item.category
                          }
                          options={categories}
                          disabled={busy}
                          placeholder="Category"
                          title="Category"
                          accessibilityLabel={`Item ${index + 1} category, ${categoryLabel}`}
                          onChange={(category) => editItem(index, { category })}
                          triggerStyle={styles.categoryTrigger}
                        />
                      </View>
                    </View>
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add item"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={() => {
                    setManualEntry(true);
                    field('items', [...form.items, { name: '', category: 'other', amount: '', quantity: '' }]);
                  }}
                  style={({ pressed }) => [
                    styles.outlineCta,
                    pressed && !busy && styles.outlineCtaPressed,
                    busy && styles.primaryCtaDisabled,
                  ]}
                >
                  <Text style={styles.outlineCtaText}>Add Item</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add items from receipt"
                  accessibilityHint="Take a photo or choose one from your library"
                  disabled={busy}
                  onPress={() => openReceiptPicker({ scanAfter: true })}
                  style={({ pressed }) => [styles.flatButton, pressed && !busy && styles.flatButtonPressed]}
                >
                  <Text style={styles.flatButtonText}>Add Items From Receipt</Text>
                </Pressable>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionLabel}>Overall Amount</Text>
                <View style={styles.summary}>
                  <SummaryRow label="Items" value={formatCents(totals?.subtotal ?? 0)} styles={styles} />
                  {(totals?.discount ?? 0) ? <SummaryRow label="Discount" value={formatCents(-(totals?.discount ?? 0))} styles={styles} /> : null}
                  {(totals?.tax ?? 0) ? <SummaryRow label="Tax" value={formatCents(totals?.tax ?? 0)} styles={styles} /> : null}
                  {(totals?.tip ?? 0) ? <SummaryRow label="Tip" value={formatCents(totals?.tip ?? 0)} styles={styles} /> : null}
                  <SummaryRow label={`Total (${form.currency || 'CAD'})`} value={formatCents(totals?.total ?? 0)} styles={styles} total />
                </View>
                {totals && printedTotal !== null ? (
                  <Text style={styles.warning} accessibilityRole="alert">
                    Total mismatch: the receipt total is {formatCents(printedTotal)}, but the items, discount, tax and tip add up to {formatCents(totals.total)}. Check the items before saving.
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.dropzone,
                    Boolean(imageUri) && styles.dropzoneWithImage,
                    busy && styles.pickerDisabled,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add your items"
                    accessibilityHint="Take a photo or choose one from your library"
                    disabled={busy}
                    onPress={() => openReceiptPicker()}
                    style={({ pressed }) => [
                      styles.dropzoneHit,
                      pressed && !busy && !imageUri && styles.dropzonePressed,
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
                  {asset ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove selected photo"
                      disabled={busy}
                      hitSlop={theme.spacing[2]}
                      onPress={() => clear()}
                      style={({ pressed }) => [
                        styles.dropzoneRemove,
                        pressed && !busy && styles.dropzoneRemovePressed,
                      ]}
                    >
                      <SFSymbolIcon
                        name="xmark"
                        size={theme.sizes.iconSm}
                        color={theme.colors.textPrimary}
                      />
                    </Pressable>
                  ) : null}
                </View>
                {hasReceipt && !imageUri ? <Text style={styles.hint}>A receipt is attached.</Text> : null}
                {form.parsed_receipt?.warnings.map((warning, i) => <Text key={i} style={styles.warning}>{warning}</Text>)}
                {asset ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Scan and fill expense"
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    onPress={requestScan}
                    style={({ pressed }) => [
                      styles.flatButton,
                      styles.flatButtonRow,
                      pressed && !busy && styles.flatButtonPressed,
                    ]}
                  >
                    <SFSymbolIcon
                      name="checkmark"
                      size={theme.sizes.iconSm}
                      color={theme.colors.accent}
                    />
                    <Text style={styles.flatButtonText}>Scan Expense</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Enter manually"
                    disabled={busy}
                    onPress={startManualEntry}
                    style={({ pressed }) => [styles.flatButton, pressed && !busy && styles.flatButtonPressed]}
                  >
                    <Text style={styles.flatButtonText}>Enter Manually</Text>
                  </Pressable>
                )}
              </>
            )}
          </>
        ) : null}

        {error ? <Text style={styles.warning}>{error}</Text> : null}
        {busy ? <ActivityIndicator color={theme.colors.accent} /> : null}

        {isDrawer && step === 1 ? (
          <View style={styles.ctaDock}>
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
          </View>
        ) : isDrawer && step === 2 ? (
          <View style={[styles.ctaDock, styles.ctaRow]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              disabled={busy}
              onPress={() => confirmDiscardItems(discardItemsAndGoToStep1)}
              style={({ pressed }) => [
                styles.outlineCta,
                styles.ctaHalf,
                pressed && !busy && styles.outlineCtaPressed,
                busy && styles.primaryCtaDisabled,
              ]}
            >
              <Text style={styles.outlineCtaText}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save expense"
              accessibilityState={{ disabled: !canSave || busy }}
              disabled={!canSave || busy}
              onPress={save}
              style={({ pressed }) => [
                styles.primaryCta,
                styles.ctaHalf,
                pressed && canSave && !busy && styles.primaryCtaPressed,
                (!canSave || busy) && styles.primaryCtaDisabled,
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
          <View style={styles.ctaDock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save expense"
              accessibilityState={{ disabled: !canSave || busy }}
              disabled={!canSave || busy}
              onPress={save}
              style={({ pressed }) => [
                styles.primaryCta,
                pressed && canSave && !busy && styles.primaryCtaPressed,
                (!canSave || busy) && styles.primaryCtaDisabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={theme.colors.onAccent} />
              ) : (
                <Text style={styles.primaryCtaText}>Save expense</Text>
              )}
            </Pressable>
          </View>
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

      <InlineSnackbar
        message={scanToast ?? ''}
        visible={Boolean(scanToast)}
        onHidden={() => setScanToast(null)}
        bottomOffset={bottomPad + theme.spacing[3]}
      />
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;

/** Convert #RRGGBB to rgba() for translucent surfaces. */
function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
function createStyles(theme: Theme) {
  const m = theme.createActionModal;

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bgSurface },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: theme.colors.bgSurface },
    content: { padding: 20, gap: 12, paddingBottom: 40 },
    drawerContent: {
      paddingHorizontal: theme.sizes.pagePaddingX,
      paddingTop: theme.spacing[12], // 48
      gap: theme.spacing[3],
    },
    drawerContentGrow: {
      flexGrow: 1,
    },
    ctaDock: {
      // Pin actions to the bottom when content is short; scroll lower when it isn't.
      marginTop: 'auto',
      paddingTop: theme.spacing[8],
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    ctaHalf: {
      flex: 1,
    },
    primaryCta: {
      height: m.actionHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.accent,
    },
    outlineCta: {
      height: m.actionHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.radius.full,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.accentStrong,
      backgroundColor: theme.colors.bgSurface,
    },
    outlineCtaPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    outlineCtaText: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.accentStrong,
      textAlign: 'center',
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
      fontFamily: theme.fonts.sans.regular,
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
      backgroundColor: theme.colors.bgSurface,
    },
    dropzoneWithImage: {
      height: theme.sizes.receiptDropzonePreview,
    },
    dropzoneHit: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
      letterSpacing: 0,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    dropzoneCaption: {
      fontFamily: theme.fonts.sans.regular,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    dropzonePreview: {
      width: '100%',
      height: '100%',
    },
    dropzoneRemove: {
      position: 'absolute',
      top: theme.spacing[3],
      // 4 (prior inset) + 6 toward center
      right: theme.spacing[1] + theme.spacing[1.5],
      width: theme.sizes.controlSm,
      height: theme.sizes.controlSm,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(theme.colors.bgSurface, 0.72),
      ...theme.shadows.nav,
    },
    dropzoneRemovePressed: {
      opacity: 0.7,
    },
    flatButton: {
      alignSelf: 'center',
      minHeight: theme.sizes.touchTarget,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[6],
      borderRadius: theme.radius.full,
    },
    flatButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2], // 8 — icon to label
    },
    flatButtonPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    flatButtonText: {
      fontFamily: theme.fonts.sans.semibold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
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
    warning: { color: theme.colors.textPrimary, backgroundColor: theme.colors.accentSubtle, padding: 12, borderRadius: 8 },
    item: {
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.lg,
      // Visible so the category popover can extend below the card.
      overflow: 'visible',
      backgroundColor: theme.colors.bgSurface,
      zIndex: 1,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing[2],
      paddingLeft: theme.spacing[4],
      paddingRight: theme.spacing[3],
      paddingVertical: theme.spacing[2],
      borderBottomWidth: theme.sizes.borderWidth,
      borderBottomColor: theme.colors.borderSubtle,
      minHeight: theme.sizes.controlLg,
    },
    itemName: {
      flex: 1,
      fontFamily: theme.fonts.sans.medium,
      fontSize: 16,
      letterSpacing: -0.48,
      color: theme.colors.textPrimary,
      minHeight: theme.sizes.touchTarget,
      paddingVertical: theme.spacing[2],
    },
    itemBody: {
      gap: theme.spacing[3],
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[3],
      overflow: 'visible',
      zIndex: 2,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    itemRemove: {
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -theme.spacing[2],
    },
    itemRemovePressed: {
      opacity: 0.7,
    },
    lineTotal: { ...theme.typography.bodySm, color: theme.colors.textSecondary, textAlign: 'right' },
    quantityControl: {
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: theme.sizes.controlLg,
    },
    quantityInput: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 16,
      letterSpacing: -0.48,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      // Wide enough for the caret to paint next to a digit / placeholder.
      minWidth: theme.spacing[8],
      padding: 0,
    },
    amountControl: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      gap: theme.spacing[1],
    },
    amountPrefix: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 16,
      letterSpacing: -0.48,
      color: theme.colors.textPrimary,
    },
    amountPrefixPlaceholder: {
      color: theme.colors.textTertiary,
    },
    amountInput: {
      flex: 1,
      fontFamily: theme.fonts.sans.medium,
      fontSize: 16,
      letterSpacing: -0.48,
      color: theme.colors.textPrimary,
      padding: 0,
      minWidth: 0,
    },
    categoryTrigger: {
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      minHeight: undefined,
    },
    sectionDivider: {
      height: theme.sizes.borderWidth,
      backgroundColor: theme.colors.borderSubtle,
      marginVertical: theme.spacing[3],
    },
    summary: {
      gap: theme.spacing[2],
      padding: theme.spacing[5],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing[3] },
    totalText: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
  });
}
