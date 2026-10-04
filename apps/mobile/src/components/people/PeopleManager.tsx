import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadState } from '@/components/ui/LoadState';
import { TextField } from '@/components/ui/TextField';
import { useFocusedData } from '@/hooks/useFocusedData';
import { displayName } from '@/lib/events';
import { getFriends, normalizeUsername, USERNAME_PATTERN } from '@/lib/friends';
import { addPerson, cancelPeopleInvite, getPeople, removePerson, type PeopleKind } from '@/lib/people';
import { useProfile } from '@/lib/profile';
import { useTheme } from '@/theme';

export function PeopleManager({ kind, id }: { kind: PeopleKind; id: string }) {
  const theme = useTheme();
  const { profile } = useProfile();
  const [username, setUsername] = useState('');
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const loader = useCallback(() => Promise.all([getPeople(kind, id), getFriends()])
    .then(([people, friends]) => ({ people, friends })), [kind, id]);
  const { data, loading, error, retry, busyIds, run } = useFocusedData(loader, 'Could not load people.');
  const styles = StyleSheet.create({
    content: { gap: theme.spacing[5] },
    text: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
  });

  async function add(person: { user_id: string } | { username: string }) {
    const result = await addPerson(kind, id, person);
    setNotice(result.status === 'added'
      ? `${displayName(result.user)} added.`
      : `Invitation sent to ${displayName(result.user)}. They'll join when they accept.`);
    return result;
  }

  function submit() {
    if (busyIds.has('username')) return;
    const value = normalizeUsername(username);
    if (!USERNAME_PATTERN.test(value)) { setFormError('Enter a valid username.'); return; }
    setFormError('');
    setNotice('');
    void run('username', async () => {
      await add({ username: value });
      setUsername('');
    }, 'Could not add person');
  }

  if (!data) return <LoadState loading={loading} error={error} fallbackError="Could not load people." onRetry={retry} />;
  const { people, friends } = data;
  const memberIds = new Set(people.members.map((member) => member.id));
  const invitedIds = new Set(people.invites.map((invite) => invite.user.id));
  const friendIds = new Set(friends.friends.map(({ user }) => user.id));
  const split = people.split;
  const canManageSplit = kind === 'expense' && people.created_by === profile?.id;
  const pending = [...friends.incoming, ...friends.outgoing];

  return <View style={styles.content}>
    <Text style={styles.text}>Friends are added immediately. Everyone else joins after accepting an invitation.</Text>
    {error ? <LoadState loading={false} error={error} fallbackError="Could not refresh people." onRetry={retry} /> : null}
    <TextField label="Add by username" prefix="@" value={username} onChangeText={(value) => {
      setUsername(value); setFormError(''); setNotice('');
    }} placeholder="username" autoCapitalize="none" autoCorrect={false} maxLength={21}
      onSubmitEditing={submit} returnKeyType="send" error={formError} disabled={busyIds.has('username')} />
    <Button label="Add or invite" onPress={submit} loading={busyIds.has('username')} disabled={!username.trim()} />
    {notice ? <Text style={styles.text} accessibilityLiveRegion="polite">{notice}</Text> : null}
    {split ? <>
      <Text style={styles.text}>Paid by {split.paid_by.id === profile?.id ? 'you' : displayName(split.paid_by)} · {split.currency} {split.total}</Text>
      <Text style={styles.text}>Equal shares update when people are added or removed. Pending invitations are excluded until accepted.</Text>
      {canManageSplit && !memberIds.has(people.created_by) ? <Button label="Include my share" variant="secondary"
        loading={busyIds.has(people.created_by)} onPress={() => run(people.created_by,
          () => add({ user_id: people.created_by }), 'Could not include your share')} /> : null}
    </> : null}
    <ListGroup title={kind === 'expense' ? 'Split between' : 'Members'} count={people.members.length}>
      {people.members.map((member) => {
        const creator = member.id === people.created_by;
        const me = member.id === profile?.id;
        return <FriendRow key={member.id} username={member.username ?? 'unknown'}
          subtitle={split
            ? `${me ? 'You · ' : ''}${split.currency} ${split.shares.find((share) => share.user.id === member.id)?.amount ?? '0.00'}`
            : creator ? 'Creator' : me ? 'You' : undefined}
          actions={(kind === 'expense'
            ? canManageSplit || (!creator && !me && friendIds.has(member.id))
            : !creator && !me && friendIds.has(member.id)) ? <Button label={me ? 'Exclude my share' : 'Remove'} size="sm" variant="ghost"
            disabled={kind === 'expense' && people.members.length <= 1}
            loading={busyIds.has(member.id)} accessibilityLabel={`Remove ${displayName(member)}`}
            onPress={() => run(member.id, () => removePerson(kind, id, member.id), 'Could not remove person')} /> : null} />;
      })}
    </ListGroup>
    {people.invites.length ? <ListGroup title="Pending invitations" count={people.invites.length}>
      {people.invites.map((invite) => <FriendRow key={invite.id} username={invite.user.username ?? 'unknown'}
        subtitle="Waiting for acceptance" actions={<Button label="Cancel" size="sm" variant="ghost"
          loading={busyIds.has(invite.id)} accessibilityLabel={`Cancel invitation for ${displayName(invite.user)}`}
          onPress={() => run(invite.id, () => cancelPeopleInvite(kind, invite.id), 'Could not cancel invitation')} />} />)}
    </ListGroup> : null}
    <ListGroup title="Your friends" count={friends.friends.length} emptyText="Add people by username above.">
      {friends.friends.map(({ user }) => {
        const member = memberIds.has(user.id);
        return <FriendRow key={user.id} username={user.username} subtitle={member ? 'Already a member' : 'Added immediately'}
          actions={<Button label={member ? 'Added' : 'Add'} size="sm" disabled={member} loading={busyIds.has(user.id)}
            accessibilityLabel={`Add @${user.username}`}
            onPress={() => run(user.id, () => add({ user_id: user.id }), 'Could not add friend')} />} />;
      })}
    </ListGroup>
    {pending.length ? <ListGroup title="Pending friend requests" count={pending.length}>
      {pending.map(({ user }) => {
        const member = memberIds.has(user.id);
        const invited = invitedIds.has(user.id);
        return <FriendRow key={user.id} username={user.username}
          subtitle={member ? 'Already a member' : invited ? 'Invitation sent' : 'Acceptance required'}
          actions={<Button label={member ? 'Added' : invited ? 'Invited' : 'Invite'} size="sm"
            disabled={member || invited} loading={busyIds.has(user.id)} accessibilityLabel={`Invite @${user.username}`}
            onPress={() => run(user.id, () => add({ user_id: user.id }), 'Could not send invitation')} />} />;
      })}
    </ListGroup> : null}
  </View>;
}
