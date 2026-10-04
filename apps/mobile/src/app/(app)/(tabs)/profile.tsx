import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme';

export default function ProfileScreen() {
  const { session } = useAuth();
  const theme = useTheme();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Could not sign out', error.message);
  }

  return (
    <Screen title="Profile" description={session?.user.email ?? 'Your account and preferences.'}>
      <Pressable
        style={[
          styles.button,
          {
            marginTop: theme.spacing[6],
            paddingVertical: theme.spacing[3],
            paddingHorizontal: theme.spacing[4],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.textPrimary,
          },
        ]}
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={[styles.buttonText, { color: theme.colors.textInverse, ...theme.typography.label }]}>
          Sign out
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontWeight: '600',
  },
});
