import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadState } from '@/components/ui/LoadState';
import { Screen } from '@/components/ui/Screen';
import { useFocusedData } from '@/hooks/useFocusedData';
import { displayName, formatEventDate, getEvent, removeInvite } from '@/lib/events';
import { useProfile } from '@/lib/profile';
import { useTheme, type Theme } from '@/theme';

export default function EventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { profile } = useProfile();
  const theme = useTheme();
  const styles = createStyles(theme);
  const loader = useCallback(() => getEvent(eventId), [eventId]);
  const { data: event, loading, refreshing, error, busyIds, run, refresh, retry } = useFocusedData(
    loader,
    'Could not load this event.',
  );

  if (!event) {
    return (
      <Screen title="Event" withHeader>
        <View style={styles.content}>
          <LoadState loading={loading} error={error} fallbackError="Could not load this event." onRetry={retry} />
        </View>
      </Screen>
    );
  }

  const date = formatEventDate(event.starts_at ?? event.created_at);
  const description = [date, event.description].filter(Boolean).join(' · ');

  return (
    <Screen title={event.title} description={description} onRefresh={refresh} refreshing={refreshing} withHeader>
      <View style={styles.content}>
        <View style={styles.actions}>
          <Button
            label="Manage people"
            onPress={() => router.push({ pathname: '/events/[eventId]/invite', params: { eventId } })}
          />
          <Button
            label="Add receipt"
            variant="secondary"
            onPress={() => router.push({ pathname: '/events/[eventId]/receipts/scan', params: { eventId } })}
          />
        </View>

        <ListGroup title="Members" count={event.members.length}>
          {event.members.map((member) => {
            const roles = [
              member.id === event.created_by ? 'Host' : null,
              member.id === profile?.id ? 'You' : null,
            ].filter(Boolean);
            return (
              <FriendRow
                key={member.id}
                username={member.username ?? 'unknown'}
                subtitle={roles.length ? roles.join(' · ') : undefined}
              />
            );
          })}
        </ListGroup>

        {event.invites.length > 0 ? (
          <ListGroup title="Invited" count={event.invites.length}>
            {event.invites.map((invite) => (
              <FriendRow
                key={invite.id}
                username={invite.user.username ?? 'unknown'}
                subtitle={`Invited by ${invite.invited_by.id === profile?.id ? 'you' : displayName(invite.invited_by)}`}
                actions={
                  <Button
                    label="Cancel"
                    size="sm"
                    variant="ghost"
                    loading={busyIds.has(invite.id)}
                    onPress={() => run(invite.id, () => removeInvite(invite.id), 'Could not cancel invite')}
                    accessibilityLabel={`Cancel invite for ${displayName(invite.user)}`}
                  />
                }
              />
            ))}
          </ListGroup>
        ) : null}
      </View>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    content: {
      marginTop: theme.spacing[6],
      gap: theme.spacing[8],
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing[3],
    },
  });
}
