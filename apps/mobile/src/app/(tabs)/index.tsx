import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';

export default function PlansScreen() {
  return (
    <Screen title="Plans" description="Upcoming plans and events with friends.">
      {/* Temporary entry point until plans are loaded from the API. */}
      <Link href={{ pathname: '/events/[eventId]', params: { eventId: 'test' } }} style={styles.link}>
        <Text style={styles.linkText}>Open test event</Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { marginTop: 24, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#2563eb', textAlign: 'center' },
  linkText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
});
