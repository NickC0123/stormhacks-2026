import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiFetch } from '@/lib/api';

type CreatedEvent = { id: string; title: string };

export default function NewEventScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function createEvent() {
    const eventTitle = title.trim();
    if (!eventTitle) {
      Alert.alert('Add a title', 'Enter an event title before creating it.');
      return;
    }
    setBusy(true);
    try {
      const event = await apiFetch<CreatedEvent>('/events', {
        method: 'POST',
        body: JSON.stringify({ title: eventTitle, description: description.trim() || null }),
      });
      router.replace({ pathname: '/events/[eventId]', params: { eventId: event.id } });
    } catch (error) {
      Alert.alert('Could not create event', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Event title</Text>
        <TextInput style={styles.input} placeholder="Weekend trip" value={title} onChangeText={setTitle} maxLength={200} />
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput style={[styles.input, styles.description]} placeholder="What are you planning?" value={description} onChangeText={setDescription} multiline />

        <Pressable style={styles.button} disabled={busy} onPress={createEvent} accessibilityRole="button">
          {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Create event</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, gap: 12 },
  label: { fontSize: 15, fontWeight: '600', color: '#111827' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, color: '#111827' },
  description: { minHeight: 100, textAlignVertical: 'top' },
  button: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', marginTop: 8 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
