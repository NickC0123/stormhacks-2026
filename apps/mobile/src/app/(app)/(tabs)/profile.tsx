import { Alert, StyleSheet, Text, View } from 'react-native';

import { FriendsSection } from '@/components/friends/FriendsSection';
import { ContactsSection } from '@/components/profile/ContactsSection';
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

  const name = profile?.display_name?.trim() || profile?.username || 'Profile';
  const signedInAs = session?.user.email
    ? `Signed in as ${session.user.email}`
    : undefined;

  return (
    <Screen
      title={name}
      titleVariant="page"
      titleColor="accent"
      titleAlign="center"
      description={signedInAs}
      onRefresh={friends.refresh}
      refreshing={friends.refreshing}
      headerLeft={<View />}
      headerRight={<View />}
    >
      <View style={styles.content}>
        <FriendsSection friends={friends} />

        <ContactsSection />

        <View style={styles.account}>
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
  });
}
