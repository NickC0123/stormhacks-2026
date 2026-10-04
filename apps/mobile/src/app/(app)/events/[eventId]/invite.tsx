import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadState } from '@/components/ui/LoadState';
import { Screen } from '@/components/ui/Screen';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getEvent, inviteToEvent } from '@/lib/events';
import { getFriends } from '@/lib/friends';
import { useTheme, type Theme } from '@/theme';

export default function InviteFriendsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const theme = useTheme();
  const styles = createStyles(theme);
  const loader = useCallback(
    () => Promise.all([getEvent(eventId), getFriends()]).then(([event, friends]) => ({ event, friends })),
    [eventId],
  );
  const { data, loading, refreshing, error, busyIds, run, refresh, retry } = useFocusedData(
    loader,
    'Could not load your friends.',
  );

  if (!data) {
    return (
      <Screen title="Invite friends" withHeader>
        <View style={styles.content}>
          <LoadState loading={loading} error={error} fallbackError="Could not load your friends." onRetry={retry} />
        </View>
      </Screen>
    );
  }

  const { event, friends } = data;
  const memberIds = new Set(event.members.map((member) => member.id));
  const invitedIds = new Set(event.invites.map((invite) => invite.user.id));

  return (
    <Screen
      title={event.title}
      description="Friends join the event once they accept your invite."
      onRefresh={refresh}
      refreshing={refreshing}
      withHeader
    >
      <View style={styles.content}>
        <ListGroup
          title="Your friends"
          count={friends.friends.length}
          emptyText="You don't have any friends to invite yet. Add friends from your profile."
        >
          {friends.friends.map(({ user }) => {
            const isMember = memberIds.has(user.id);
            const isInvited = invitedIds.has(user.id);
            return (
              <FriendRow
                key={user.id}
                username={user.username}
                subtitle={isMember ? 'Already in this event' : isInvited ? 'Invite sent' : undefined}
                actions={
                  isMember ? null : (
                    <Button
                      label={isInvited ? 'Invited' : 'Invite'}
                      size="sm"
                      variant={isInvited ? 'secondary' : 'primary'}
                      disabled={isInvited}
                      loading={busyIds.has(user.id)}
                      onPress={() => run(user.id, () => inviteToEvent(eventId, user.id), 'Could not send invite')}
                      accessibilityLabel={isInvited ? `@${user.username} invited` : `Invite @${user.username}`}
                    />
                  )
                }
              />
            );
          })}
        </ListGroup>
        <Button label="Done" variant="secondary" onPress={() => router.back()} />
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
  });
}
