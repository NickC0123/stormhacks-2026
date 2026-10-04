import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { EventInvitesAndList } from '@/components/events/EventInvitesAndList';
import { EventMemoryCard } from '@/components/events/EventMemoryCard';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { Screen } from '@/components/ui/Screen';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useEventsHome } from '@/hooks/useEventsHome';
import { useTheme, type Theme } from '@/theme';

export default function EventsScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const home = useEventsHome();
  const events = home.data?.events ?? [];

  return (
    <Screen
      title="Events"
      titleVariant="page"
      titleColor="accent"
      titleAlign="center"
      bottomFade
      onRefresh={home.refresh}
      refreshing={home.refreshing}
      headerLeft={
        // SF Symbol 􀣔 clock.arrow.circlepath
        <CircleIconButton accessibilityLabel="Photo archive" onPress={() => router.push('/archive')}>
          <SFSymbolIcon name="clock.arrow.circlepath" />
        </CircleIconButton>
      }
      headerRight={
        // SF Symbol: plus — opens Add Event drawer directly
        <CircleIconButton
          accessibilityLabel="Add Event"
          onPress={() => router.push('/events/new')}
        >
          <SFSymbolIcon name="plus" />
        </CircleIconButton>
      }
    >
      <View style={styles.list}>
        <EventInvitesAndList home={home} />
      </View>

      {home.data && events.length === 0 ? (
        <Text style={styles.empty}>No events yet. Tap + to create one, or ask a friend to invite you.</Text>
      ) : null}

      <View style={styles.cards}>
        {events.map((event) => (
          <EventMemoryCard
            key={event.id}
            event={event}
            onPress={() => router.push({ pathname: '/events/[eventId]', params: { eventId: event.id } })}
          />
        ))}
      </View>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      marginTop: theme.spacing[8],
    },
    empty: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing[10],
      paddingHorizontal: theme.spacing[6],
    },
    cards: {
      flexDirection: 'column',
      gap: theme.spacing[12],
      marginTop: theme.spacing[3],
      paddingBottom: theme.spacing[12],
    },
  });
}
