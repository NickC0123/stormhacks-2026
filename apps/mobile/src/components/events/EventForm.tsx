import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { EventDateTimeField } from '@/components/events/EventDateTimeField';
import { EventPeoplePicker } from '@/components/events/EventPeoplePicker';
import { Button } from '@/components/ui/Button';
import { useSnackbar } from '@/components/ui/Snackbar';
import { TextField } from '@/components/ui/TextField';
import { createEvent, updateEvent } from '@/lib/events';
import { dateTimeFields, eventSchedulePayload, parseEventDateTime, type EventDateTime } from '@/lib/eventSchedule';
import { useTheme, type Theme } from '@/theme';
import type { EventDetail, FriendUser } from '@/types';

export function EventForm({ event, onBusyChange }: { event?: EventDetail; onBusyChange: (busy: boolean) => void }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { showSnackbar } = useSnackbar();
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [start, setStart] = useState<EventDateTime | null>(event?.starts_at ? dateTimeFields(new Date(event.starts_at)) : null);
  const [end, setEnd] = useState<EventDateTime | null>(event?.ends_at ? dateTimeFields(new Date(event.ends_at)) : null);
  const [people, setPeople] = useState<FriendUser[]>([]);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function save() {
    if (!title.trim() || busy) return;
    setError('');
    let schedule;
    try { schedule = eventSchedulePayload(start, end); }
    catch (err) { setError(err instanceof Error ? err.message : 'Check the event schedule.'); return; }
    const body = { title: title.trim(), description: description.trim() || null, location: location.trim() || null, ...schedule };
    setBusy(true);
    onBusyChange(true);
    try {
      if (event) {
        await updateEvent(event.id, body);
        router.back();
      } else {
        const created = await createEvent({ ...body, member_ids: people.map((person) => person.id), invite_usernames: usernames });
        router.replace({ pathname: '/events/[eventId]', params: { eventId: created.id } });
      }
      setTimeout(() => showSnackbar({ message: event ? 'Event updated.' : 'Event created.', variant: 'success' }), theme.motion.modal.closeDur);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this event.');
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  function addEnd() {
    if (!start) return;
    try {
      const date = parseEventDateTime(start);
      date.setHours(date.getHours() + 1);
      setEnd(dateTimeFields(date));
    } catch (err) { setError(err instanceof Error ? err.message : 'Check the start time.'); }
  }

  return <View style={styles.form}>
    <View style={styles.section}>
      <TextField label="Event name" value={title} onChangeText={setTitle} maxLength={200} placeholder="e.g. Weekend trip" disabled={busy} />
      <Text style={styles.label}>Description · optional</Text>
      <TextInput accessibilityLabel="Event description" style={styles.description} value={description} onChangeText={setDescription}
        placeholder="Plans, details, or anything people should know" placeholderTextColor={theme.colors.textPlaceholder} multiline textAlignVertical="top" editable={!busy} />
      <TextField label="Location · optional" value={location} onChangeText={setLocation} maxLength={500} placeholder="Venue, address, or meeting link" disabled={busy} />
    </View>
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>When</Text>
      {start ? <>
        <EventDateTimeField label="Starts" value={start} onChange={setStart} disabled={busy} />
        {end ? <>
          <EventDateTimeField label="Ends" value={end} onChange={setEnd} disabled={busy} />
          <Button label="Remove end time" variant="ghost" size="sm" disabled={busy} onPress={() => setEnd(null)} />
        </> : <Button label="Add an end time" variant="ghost" size="sm" disabled={busy} onPress={addEnd} />}
        <Text style={styles.hint}>Times are in {timezone.replaceAll('_', ' ')}.</Text>
        <Button label="Remove schedule" variant="ghost" size="sm" disabled={busy} onPress={() => { setStart(null); setEnd(null); }} />
      </> : <>
        <Text style={styles.hint}>Schedule it now, or leave the date open.</Text>
        <Button label="Add date and time" variant="secondary" disabled={busy} onPress={() => {
          const date = new Date();
          date.setHours(date.getHours() + 1, 0, 0, 0);
          setStart(dateTimeFields(date));
        }} />
      </>}
    </View>
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>People</Text>
      {event ? <>
        <Text style={styles.hint}>{event.members.length} member{event.members.length === 1 ? '' : 's'}{event.invites.length ? ` · ${event.invites.length} pending invitation${event.invites.length === 1 ? '' : 's'}` : ''}</Text>
        <Button label="Manage people" variant="secondary" disabled={busy} onPress={() => router.push({ pathname: '/events/[eventId]/invite', params: { eventId: event.id } })} />
      </> : <>
        <Text style={styles.hint}>{people.length + usernames.length ? `${people.length + usernames.length} selected · ${[...people.map((person) => `@${person.username}`), ...usernames.map((name) => `@${name}`)].join(', ')}` : 'Start with yourself, or bring people along.'}</Text>
        <Button label={peopleOpen ? 'Done choosing people' : 'Add people'} variant="secondary" disabled={busy} onPress={() => setPeopleOpen(!peopleOpen)} />
        {peopleOpen ? <EventPeoplePicker selected={people} onChange={setPeople} usernames={usernames} onUsernamesChange={setUsernames} disabled={busy} /> : null}
      </>}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Button label={event ? 'Save changes' : 'Create event'} loading={busy} disabled={!title.trim()} onPress={() => { void save(); }} />
  </View>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    form: { gap: theme.spacing[6], marginTop: theme.spacing[4] },
    section: { gap: theme.spacing[3], paddingBottom: theme.spacing[5], borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
    heading: { ...theme.typography.h4, color: theme.colors.textPrimary },
    label: { ...theme.typography.label, color: theme.colors.textPrimary },
    hint: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    description: { ...theme.typography.body, minHeight: 96, color: theme.colors.textPrimary, padding: theme.spacing[3], borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.md },
    error: { ...theme.typography.bodySm, color: theme.colors.danger },
  });
}
