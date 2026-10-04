import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { EventMemoryCard } from '@/components/events/EventMemoryCard';
import { useTheme } from '@/theme';

export default function EventsScreen() {
  const theme = useTheme();

  return (
    <Screen title="Events" titleVariant="page" titleColor="accent">
      {/* Temporary entry point until plans are loaded from the API. */}
      
      <View style={{ flexDirection: 'column', gap: theme.spacing[12], marginTop: theme.spacing[8] }}>
        <EventMemoryCard />
        <EventMemoryCard />
        <EventMemoryCard />
      </View>

      <Link
        href={{ pathname: '/events/[eventId]', params: { eventId: 'test' } }}
        style={[
          styles.link,
          {
            marginTop: theme.spacing[6],
            paddingVertical: theme.spacing[3],
            borderRadius: theme.radius.md,
            borderColor: theme.colors.accentStrong,
          },
        ]}
      >
        <Text style={[styles.linkText, { color: theme.colors.accentStrong, ...theme.typography.body }]}>
          Open test event
        </Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    borderWidth: 1,
    textAlign: 'center',
  },
  linkText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
