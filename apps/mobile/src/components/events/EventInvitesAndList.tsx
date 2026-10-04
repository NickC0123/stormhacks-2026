import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadState } from '@/components/ui/LoadState';
import type { EventsHomeState } from '@/hooks/useEventsHome';
import { acceptInvite, displayName, removeInvite } from '@/lib/events';
import { useTheme, type Theme } from '@/theme';

function openEvent(eventId: string) {
  router.push({ pathname: '/events/[eventId]', params: { eventId } });
}

/** Incoming invites (accept / decline). Event memory cards render separately. */
export function EventInvitesAndList({ home }: { home: EventsHomeState }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { data, loading, error, busyIds, run, retry } = home;

  if (!data) {
    return <LoadState loading={loading} error={error} fallbackError="Could not load your events." onRetry={retry} />;
  }

  if (data.invites.length === 0) return null;

  return (
    <View style={styles.section}>
      <ListGroup title="Invitations" count={data.invites.length}>
        {data.invites.map((invite) => (
          <FriendRow
            key={invite.id}
            username={invite.invited_by.username ?? 'unknown'}
            avatarColor={invite.invited_by.avatar_color}
            subtitle={`Invited you to ${invite.event.title}`}
            actions={
              <>
                <Button
                  label="Join"
                  size="sm"
                  loading={busyIds.has(invite.id)}
                  onPress={() =>
                    run(
                      invite.id,
                      async () => {
                        const event = await acceptInvite(invite.id);
                        openEvent(event.id);
                      },
                      'Could not join event',
                    )
                  }
                  accessibilityLabel={`Join ${invite.event.title}, invited by ${displayName(invite.invited_by)}`}
                />
                <Button
                  label="Decline"
                  size="sm"
                  variant="secondary"
                  disabled={busyIds.has(invite.id)}
                  onPress={() => run(invite.id, () => removeInvite(invite.id), 'Could not decline invite')}
                  accessibilityLabel={`Decline invite to ${invite.event.title}`}
                />
              </>
            }
          />
        ))}
      </ListGroup>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    section: {
      gap: theme.spacing[8],
    },
  });
}
