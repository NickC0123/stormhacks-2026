import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';

export default function EventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  return (
    <Screen title="Event" description="Event details, receipts, and members.">
      <Link href={{ pathname: '/events/[eventId]/receipts/scan', params: { eventId } }} style={styles.button}>
        <Text style={styles.buttonText}>Add receipt</Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 24, paddingVertical: 14, borderRadius: 10, backgroundColor: '#2563eb', textAlign: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
