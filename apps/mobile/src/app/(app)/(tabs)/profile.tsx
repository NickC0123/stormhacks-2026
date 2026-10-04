import { Alert, StyleSheet, Text, View } from 'react-native';

import { FriendsSection } from '@/components/friends/FriendsSection';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { useTheme, type Theme } from '@/theme';

export default function ProfileScreen() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const friends = useFriends();
  const theme = useTheme();
  const styles = createStyles(theme);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Could not sign out', error.message);
  }

  return (
    <Screen
      title="Profile"
      description={profile?.username ? `@${profile.username}` : undefined}
      onRefresh={friends.refresh}
      refreshing={friends.refreshing}
    >
      <View style={styles.content}>
        <FriendsSection friends={friends} />

        <View style={styles.account}>
          {session?.user.email ? (
            <Text style={styles.signedInAs}>Signed in as {session.user.email}</Text>
          ) : null}
          <Button label="Sign out" variant="secondary" onPress={signOut} />
        </View>
      </View>
    </Screen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    content: {
      marginTop: theme.spacing[8],
      gap: theme.spacing[12],
    },
    account: {
      alignItems: 'flex-start',
      gap: theme.spacing[3],
    },
    signedInAs: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
  });
}
