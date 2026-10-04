import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { session } = useAuth();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Could not sign out', error.message);
  }

  return (
    <Screen title="Profile" description={session?.user.email ?? 'Your account'}>
      <Pressable style={styles.button} onPress={signOut} accessibilityRole="button">
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, marginTop: 24, backgroundColor: '#111827', borderRadius: 10 },
  buttonText: { color: '#ffffff', fontWeight: '600' },
});
