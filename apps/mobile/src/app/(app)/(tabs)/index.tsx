import { StyleSheet, View } from 'react-native';

import { EventInvitesAndList } from '@/components/events/EventInvitesAndList';
import { EventMemoryCard } from '@/components/events/EventMemoryCard';
import { Screen } from '@/components/ui/Screen';
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
      onRefresh={home.refresh}
      refreshing={home.refreshing}
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
      marginTop: theme.spacing[12],
    },
  });
}
