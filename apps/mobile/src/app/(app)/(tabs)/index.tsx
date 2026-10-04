import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

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

      {/* Demo cards until memories are loaded from the API. */}
      <View style={styles.cards}>
        <EventMemoryCard />
        <EventMemoryCard />
        <EventMemoryCard />
      </View>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      marginTop: theme.spacing[8],
    },
    cards: {
      flexDirection: 'column',
      gap: theme.spacing[12],
      marginTop: theme.spacing[10],
    },
  });
}
