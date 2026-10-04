import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { LoadState } from '@/components/ui/LoadState';
import { TextField } from '@/components/ui/TextField';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getFriends, normalizeUsername, USERNAME_PATTERN } from '@/lib/friends';
import { useTheme } from '@/theme';
import type { FriendUser } from '@/types';

export function EventPeoplePicker({ selected, onChange, usernames, onUsernamesChange, disabled }: {
  selected: FriendUser[]; onChange: (people: FriendUser[]) => void;
  usernames: string[]; onUsernamesChange: (names: string[]) => void; disabled: boolean;
}) {
  const theme = useTheme();
  const { data, loading, error, retry } = useFocusedData(getFriends, 'Could not load friends.');
  const [search, setSearch] = useState('');
  const [username, setUsername] = useState('');
  const [inputError, setInputError] = useState('');
  const styles = StyleSheet.create({
    content: { gap: theme.spacing[3] },
    hint: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] },
  });
  const friends = data?.friends.filter(({ user }) => user.username.includes(normalizeUsername(search))).slice(0, search ? 50 : 6) ?? [];
  function queueUsername() {
    const normalized = normalizeUsername(username);
    if (!USERNAME_PATTERN.test(normalized)) { setInputError('Enter a valid username.'); return; }
    if (usernames.includes(normalized) || selected.some((person) => person.username === normalized)) {
      setInputError('This person is already selected.'); return;
    }
    onUsernamesChange([...usernames, normalized]);
    setUsername('');
    setInputError('');
  }
  return <View style={styles.content}>
    <Text style={styles.hint}>You’re the host. Friends join immediately; other people join after accepting an invitation.</Text>
    {selected.length ? <View style={styles.chips}>{selected.map((person) => <Button key={person.id} label={`@${person.username} ×`} size="sm" variant="secondary" disabled={disabled}
      accessibilityLabel={`Remove ${person.username} from selection`} onPress={() => onChange(selected.filter((item) => item.id !== person.id))} />)}</View> : null}
    <TextField label="Find friends" value={search} onChangeText={setSearch} placeholder="Search friends" disabled={disabled} autoCapitalize="none" />
    {loading || error ? <LoadState loading={loading} error={error} fallbackError="Could not load friends." onRetry={retry} /> : null}
    {!loading && !error && !friends.length ? <Text style={styles.hint}>{data?.friends.length ? 'No matching friends.' : 'Add people by username below.'}</Text> : null}
    {friends.map(({ user }) => {
      const picked = selected.some((person) => person.id === user.id);
      return <FriendRow key={user.id} username={user.username} avatarColor={user.avatar_color} actions={
        <Button label={picked ? 'Selected' : 'Add'} size="sm" variant={picked ? 'secondary' : 'ghost'} disabled={disabled}
          accessibilityLabel={`${picked ? 'Remove' : 'Add'} ${user.username}`} onPress={() => {
            onChange(picked ? selected.filter((person) => person.id !== user.id) : [...selected, user]);
            if (!picked) onUsernamesChange(usernames.filter((name) => name !== user.username));
          }} />
      } />;
    })}
    {!search && (data?.friends.length ?? 0) > 6 ? <Text style={styles.hint}>Search to find more friends.</Text> : null}
    <TextField label="Add by username" prefix="@" value={username} onChangeText={(value) => { setUsername(value); setInputError(''); }} placeholder="username"
      autoCapitalize="none" autoCorrect={false} maxLength={21} disabled={disabled} error={inputError} />
    <Button label="Add to event" size="sm" variant="secondary" disabled={disabled || !username.trim()} onPress={queueUsername} />
    {usernames.length ? <View style={styles.chips}>{usernames.map((name) => <Button key={name} label={`@${name} ×`} size="sm" variant="secondary" disabled={disabled}
      accessibilityLabel={`Remove ${name} from selection`} onPress={() => onUsernamesChange(usernames.filter((item) => item !== name))} />)}</View> : null}
  </View>;
}
