import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { AddFriendForm } from '@/components/friends/AddFriendForm';
import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
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
    body = loading ? (
      <ActivityIndicator color={theme.colors.textTertiary} style={styles.loading} />
    ) : (
      <View style={styles.group}>
        <Text style={styles.errorText}>{error ?? 'Could not load friends.'}</Text>
        <Button label="Try again" variant="secondary" onPress={retry} />
      </View>
    );
  } else {
    body = (
      <>
        {data.incoming.length > 0 ? (
          <Group title="Requests" count={data.incoming.length}>
            {data.incoming.map((request) => (
              <FriendRow
                key={request.id}
                username={request.user.username}
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
          </Group>
        ) : null}

        {data.outgoing.length > 0 ? (
          <Group title="Sent" count={data.outgoing.length}>
            {data.outgoing.map((request) => (
              <FriendRow
                key={request.id}
                username={request.user.username}
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
          </Group>
        ) : null}

        <Group title="Your friends" count={data.friends.length}>
          {data.friends.length === 0 ? (
            <Text style={styles.empty}>
              No friends yet. Add someone by their username above.
            </Text>
          ) : (
            data.friends.map((friend) => (
              <FriendRow
                key={friend.id}
                username={friend.user.username}
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
            ))
          )}
        </Group>
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

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        {title} · {count}
      </Text>
      <View>{children}</View>
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
    group: {
      gap: theme.spacing[2],
    },
    groupTitle: {
      ...theme.typography.button,
      color: theme.colors.textSecondary,
    },
    loading: {
      alignSelf: 'flex-start',
    },
    empty: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    errorText: {
      ...theme.typography.bodySm,
      color: theme.colors.danger,
    },
  });
}
