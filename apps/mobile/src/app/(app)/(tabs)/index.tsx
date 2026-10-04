import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { EventMemoryCard } from '@/components/events/EventMemoryCard';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { Screen } from '@/components/ui/Screen';
import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useTheme, type Theme } from '@/theme';

export default function EventsScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <Screen
      title="Events"
      titleVariant="page"
      titleColor="accent"
      titleAlign="center"
      bottomFade
      headerLeft={
        // SF Symbol 􀣔 clock.arrow.circlepath
        <CircleIconButton accessibilityLabel="History" onPress={() => {}}>
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
      {/* Temporary entry point until plans are loaded from the API. */}
      <View style={styles.cards}>
        <EventMemoryCard />
        <EventMemoryCard />
        <EventMemoryCard />
      </View>

      <Link
        href={{ pathname: '/events/[eventId]', params: { eventId: 'test' } }}
        style={styles.link}
      >
        <Text style={styles.linkText}>Open test event</Text>
      </Link>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    cards: {
      flexDirection: 'column',
      gap: theme.spacing[12],
      marginTop: theme.spacing[10],
    },
    link: {
      marginTop: theme.spacing[6],
      paddingVertical: theme.spacing[3],
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.accentStrong,
      textAlign: 'center',
    },
    linkText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.accentStrong,
      textAlign: 'center',
    },
  });
}
