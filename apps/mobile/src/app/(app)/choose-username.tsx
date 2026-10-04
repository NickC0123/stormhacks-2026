import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { normalizeUsername, setUsername, USERNAME_PATTERN, USERNAME_RULES } from '@/lib/friends';
import { useProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { useTheme, type Theme } from '@/theme';

export default function ChooseUsernameScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { setProfile } = useProfile();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const username = normalizeUsername(value);
    if (!USERNAME_PATTERN.test(username)) {
      setError(`Usernames are ${USERNAME_RULES}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setProfile(await setUsername(username));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your username.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) Alert.alert('Could not sign out', signOutError.message);
  }

  return (
    <Screen
      title="Pick a username"
      description="Friends add you by your username, so pick one they'll recognize."
    >
      <View style={styles.form}>
        <TextField
          label="Username"
          prefix="@"
          value={value}
          onChangeText={(text) => {
            setValue(text.toLowerCase());
            setError(null);
          }}
          placeholder="your_name"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          autoFocus
          maxLength={21}
          returnKeyType="done"
          onSubmitEditing={save}
          helper={USERNAME_RULES}
          error={error}
          disabled={busy}
        />
        <Button label="Continue" size="lg" fullWidth loading={busy} onPress={save} />
        <Button label="Sign out" variant="ghost" fullWidth disabled={busy} onPress={signOut} />
      </View>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    form: {
      marginTop: theme.spacing[6],
      gap: theme.spacing[4],
    },
  });
}
