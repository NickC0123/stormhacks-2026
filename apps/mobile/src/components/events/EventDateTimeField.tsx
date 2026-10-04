import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { dateTimeFields, parseEventDateTime, type EventDateTime } from '@/lib/eventSchedule';
import { useTheme } from '@/theme';

export function EventDateTimeField({ label, value, onChange, disabled }: {
  label: string; value: EventDateTime; onChange: (value: EventDateTime) => void; disabled: boolean;
}) {
  const theme = useTheme();
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState(new Date());
  const date = parseEventDateTimeSafe(value);
  const styles = StyleSheet.create({
    content: { gap: theme.spacing[2] },
    label: { ...theme.typography.label, color: theme.colors.textPrimary },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
    field: { flex: 1, minWidth: 120 },
  });
  function open(pickerMode: 'date' | 'time') {
    setDraft(date);
    setMode(pickerMode);
  }
  return <View style={styles.content}>
    <Text style={styles.label}>{label}</Text>
    {Platform.OS === 'web' ? <View style={styles.row}>
      <View style={styles.field}><TextField label={`${label} date`} value={value.date} onChangeText={(text) => onChange({ ...value, date: text })} placeholder="YYYY-MM-DD" disabled={disabled} maxLength={10} /></View>
      <View style={styles.field}><TextField label={`${label} time`} value={value.time} onChangeText={(text) => onChange({ ...value, time: text })} placeholder="HH:MM" disabled={disabled} maxLength={5} /></View>
    </View> : <>
      <View style={styles.row}>
        <View style={styles.field}><Button label={date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} variant="secondary" onPress={() => open('date')} disabled={disabled} accessibilityLabel={`Change ${label.toLowerCase()} date`} /></View>
        <View style={styles.field}><Button label={date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} variant="secondary" onPress={() => open('time')} disabled={disabled} accessibilityLabel={`Change ${label.toLowerCase()} time`} /></View>
      </View>
      {mode ? <DateTimePicker value={draft} mode={mode} display={Platform.OS === 'ios' ? mode === 'date' ? 'inline' : 'spinner' : 'default'}
        onChange={(event, selected) => {
          if (Platform.OS === 'android') setMode(null);
          if (event.type !== 'set' || !selected) return;
          const next = new Date(draft);
          if (mode === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
          else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
          setDraft(next);
          if (Platform.OS === 'android') onChange(dateTimeFields(next));
        }} /> : null}
      {mode && Platform.OS === 'ios' ? <Button label="Done" size="sm" variant="ghost" onPress={() => { onChange(dateTimeFields(draft)); setMode(null); }} /> : null}
    </>}
  </View>;
}

function parseEventDateTimeSafe(value: EventDateTime) {
  try { return parseEventDateTime(value); } catch { return new Date(); }
}
