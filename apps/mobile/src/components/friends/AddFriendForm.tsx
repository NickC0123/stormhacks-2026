import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { normalizeUsername, USERNAME_PATTERN } from '@/lib/friends';
import { useTheme, type Theme } from '@/theme';
import type { Friendship } from '@/types';

type Props = {
  onSend: (username: string) => Promise<Friendship>;
};

export function AddFriendForm({ onSend }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const username = normalizeUsername(value);
    if (!USERNAME_PATTERN.test(username)) {
      setError('Enter a valid username, like @your_friend.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const friendship = await onSend(username);
      setValue('');
      setNotice(
        friendship.status === 'accepted'
          ? `You and @${username} are now friends.`
          : `Friend request sent to @${username}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Add a friend"
        prefix="@"
        value={value}
        onChangeText={(text) => {
          setValue(text.toLowerCase());
          setError(null);
          setNotice(null);
        }}
        placeholder="username"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        maxLength={21}
        returnKeyType="send"
        onSubmitEditing={submit}
        helper={notice ?? undefined}
        error={error}
        disabled={busy}
      />
      <Button
        label="Send request"
        fullWidth
        loading={busy}
        disabled={!value.trim()}
        onPress={submit}
      />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    form: {
      gap: theme.spacing[3],
    },
  });
}
