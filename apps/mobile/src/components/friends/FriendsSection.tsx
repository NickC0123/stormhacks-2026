import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AddFriendForm } from '@/components/friends/AddFriendForm';
import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadState } from '@/components/ui/LoadState';
import type { FriendsState } from '@/hooks/useFriends';
import { useTheme, type Theme } from '@/theme';

type Props = {
  friends: FriendsState;
};

/** Add-by-username form, pending requests, and the friends list. */
export function FriendsSection({ friends }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { data, loading, error, busyIds, send, accept, remove, retry } = friends;

  function confirmRemove(id: string, username: string) {
    Alert.alert(`Remove @${username}?`, 'You can add them again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => remove(id, 'Could not remove friend'),
      },
    ]);
  }

  let body: ReactNode;
  if (!data) {
    body = (
      <LoadState loading={loading} error={error} fallbackError="Could not load friends." onRetry={retry} />
    );
  } else {
    body = (
      <>
        {data.incoming.length > 0 ? (
          <ListGroup title="Requests" count={data.incoming.length}>
            {data.incoming.map((request) => (
              <FriendRow
                key={request.id}
                username={request.user.username}
                avatarColor={request.user.avatar_color}
                subtitle="Wants to be friends"
                actions={
                  <>
                    <Button
                      label="Accept"
                      size="sm"
                      loading={busyIds.has(request.id)}
                      onPress={() => accept(request.id)}
                      accessibilityLabel={`Accept friend request from @${request.user.username}`}
                    />
                    <Button
                      label="Decline"
                      size="sm"
                      variant="secondary"
                      disabled={busyIds.has(request.id)}
                      onPress={() => remove(request.id, 'Could not decline request')}
                      accessibilityLabel={`Decline friend request from @${request.user.username}`}
                    />
                  </>
                }
              />
            ))}
          </ListGroup>
        ) : null}

        {data.outgoing.length > 0 ? (
          <ListGroup title="Sent" count={data.outgoing.length}>
            {data.outgoing.map((request) => (
              <FriendRow
                key={request.id}
                username={request.user.username}
                avatarColor={request.user.avatar_color}
                subtitle="Pending"
                actions={
                  <Button
                    label="Cancel"
                    size="sm"
                    variant="ghost"
                    loading={busyIds.has(request.id)}
                    onPress={() => remove(request.id, 'Could not cancel request')}
                    accessibilityLabel={`Cancel friend request to @${request.user.username}`}
                  />
                }
              />
            ))}
          </ListGroup>
        ) : null}

        <ListGroup
          title="Your friends"
          count={data.friends.length}
          emptyText="No friends yet. Add someone by their username above."
        >
          {data.friends.map((friend) => (
            <FriendRow
              key={friend.id}
              username={friend.user.username}
              avatarColor={friend.user.avatar_color}
              onPress={() => router.push({ pathname: '/users/[userId]', params: { userId: friend.user.id } })}
              actions={
                <Button
                  label="Remove"
                  size="sm"
                  variant="ghost"
                  loading={busyIds.has(friend.id)}
                  onPress={() => confirmRemove(friend.id, friend.user.username)}
                  accessibilityLabel={`Remove @${friend.user.username} from friends`}
                />
              }
            />
          ))}
        </ListGroup>
      </>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        Friends
      </Text>
      <AddFriendForm onSend={send} />
      {body}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing[6],
    },
    title: {
      ...theme.typography.h4,
      color: theme.colors.textPrimary,
    },
  });
}
