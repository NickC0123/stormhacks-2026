import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { LoadState } from '@/components/ui/LoadState';
import { Screen } from '@/components/ui/Screen';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getEvent, updateEvent } from '@/lib/events';
import { useProfile } from '@/lib/profile';
import { useTheme, type Theme } from '@/theme';
import type { EventDetail } from '@/types';

export default function EditEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { profile } = useProfile();
  const loader = useCallback(() => getEvent(eventId), [eventId]);
  const { data, loading, error, retry } = useFocusedData(loader, 'Could not load this event.');
  const theme = useTheme();
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen title="Edit event" headerLeft={<View />} headerRight={
      <CircleIconButton accessibilityLabel="Close event editor" onPress={() => router.back()}><SFSymbolIcon name="xmark" /></CircleIconButton>
    }>
      {!data ? <LoadState loading={loading} error={error} fallbackError="Could not load this event." onRetry={retry} /> : data.created_by !== profile?.id
        ? <Text style={{ color: theme.colors.textSecondary }}>Only the host can edit this event.</Text>
        : <EventForm key={data.id} event={data} />}
    </Screen>
  </KeyboardAvoidingView>;
}

function EventForm({ event }: { event: EventDetail }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { showSnackbar } = useSnackbar();
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? '');
  const [date, setDate] = useState<Date | null>(event.starts_at ? new Date(event.starts_at) : null);
  const [webDate, setWebDate] = useState(event.starts_at ? event.starts_at.slice(0, 10) : '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!title.trim() || busy) return;
    let startsAt = date?.toISOString() ?? null;
    if (Platform.OS === 'web') {
      const value = webDate.trim();
      if (value) {
        const parsed = new Date(`${value}T12:00:00`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) ||
          `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}` !== value) {
          setError('Enter a valid date as YYYY-MM-DD.');
          return;
        }
        // Preserve the existing time if only the name or description changed.
        startsAt = value === event.starts_at?.slice(0, 10) ? event.starts_at : parsed.toISOString();
      } else startsAt = null;
    }
    setBusy(true);
    setError('');
    try {
      await updateEvent(event.id, { title: title.trim(), description: description.trim() || null, starts_at: startsAt });
      router.back();
      showSnackbar({ message: 'Event updated.', variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this event.');
      setBusy(false);
    }
  }

  return <View style={styles.form}>
    <Text style={styles.label}>Event name</Text>
    <TextInput accessibilityLabel="Event name" style={styles.input} value={title} onChangeText={setTitle} maxLength={200} editable={!busy} />
    <Text style={styles.label}>Description</Text>
    <TextInput accessibilityLabel="Event description" style={[styles.input, styles.description]} value={description} onChangeText={setDescription}
      placeholder="What’s the plan?" placeholderTextColor={theme.colors.textPlaceholder} multiline textAlignVertical="top" editable={!busy} />
    <Text style={styles.label}>Event date · optional</Text>
    {Platform.OS === 'web' ? <TextInput accessibilityLabel="Event date, YYYY-MM-DD" style={styles.input} value={webDate} onChangeText={setWebDate}
      placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.textPlaceholder} editable={!busy} maxLength={10} /> : <>
      <Button label={date ? date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Choose a date'} variant="secondary" disabled={busy} onPress={() => setPickerOpen(true)} />
      {pickerOpen ? <DateTimePicker value={date ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
        onChange={(event, selected) => {
          if (Platform.OS === 'android') setPickerOpen(false);
          if (event.type === 'set' && selected) setDate(selected);
        }} /> : null}
      {pickerOpen && Platform.OS === 'ios' ? <Button label="Done" variant="ghost" onPress={() => setPickerOpen(false)} /> : null}
      {date ? <Button label="Remove date" variant="ghost" disabled={busy} onPress={() => { setDate(null); setPickerOpen(false); }} /> : null}
    </>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Button label="Save changes" loading={busy} disabled={!title.trim()} onPress={() => { void save(); }} />
  </View>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    form: { gap: theme.spacing[3], marginTop: theme.spacing[4] },
    label: { ...theme.typography.label, color: theme.colors.textPrimary, marginTop: theme.spacing[2] },
    input: { ...theme.typography.body, color: theme.colors.textPrimary, padding: theme.spacing[3], borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.md },
    description: { minHeight: 110 },
    error: { ...theme.typography.bodySm, color: theme.colors.danger },
  });
}
