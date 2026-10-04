import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FriendsSection } from '@/components/friends/FriendsSection';
import { ContactsSection } from '@/components/profile/ContactsSection';
import { ProfileDrawer } from '@/components/profile/ProfileDrawer';
import { ProfileIdentity } from '@/components/profile/ProfileIdentity';
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
  const [drawer, setDrawer] = useState<'friends' | 'settings' | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const requests = friends.data?.incoming.length ?? 0;
  const friendCount = friends.data?.friends.length;

  async function signOut() {
    setSigningOut(true);
    setSignOutError('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setSignOutError(err instanceof Error ? err.message : 'Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  return <>
    <Screen title="Profile" titleVariant="page" titleColor="accent" titleAlign="center" onRefresh={friends.refresh} refreshing={friends.refreshing}
      headerLeft={<View />} headerRight={<View />}>
      <View style={styles.content}>
        <ProfileIdentity username={profile?.username ?? null} avatarColor={profile?.avatar_color} />

        <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open friends${requests ? `, ${requests} pending requests` : ''}`}
          onPress={() => setDrawer('friends')} style={({ pressed }) => [styles.friendsButton, pressed && styles.pressed]}>
          <View style={styles.icon}><Ionicons name="people-outline" size={theme.sizes.iconLg} color={theme.colors.accentStrong} /></View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Friends</Text>
            <Text style={styles.subtitle}>{friendCount === undefined ? 'Add and connect' : `${friendCount} friend${friendCount === 1 ? '' : 's'}`} </Text>
          </View>
          {requests ? <View style={styles.badge}><Text style={styles.badgeText}>{requests}</Text></View> : null}
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Open contact and account settings" onPress={() => setDrawer('settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
          <Ionicons name="settings-outline" size={theme.sizes.iconLg} color={theme.colors.textSecondary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Settings</Text>
            <Text style={[styles.subtitle, { textAlign: 'center' }]}>Contact & account</Text>
          </View>
        </Pressable>
        </View>
      </View>
    </Screen>

    <ProfileDrawer visible={drawer !== null} title={drawer === 'friends' ? 'Friends' : 'Settings'} onClose={() => setDrawer(null)}
      onRefresh={drawer === 'friends' ? friends.refresh : undefined} refreshing={friends.refreshing}>
      {drawer === 'friends' ? <FriendsSection friends={friends} showTitle={false} onNavigate={() => setDrawer(null)} /> : drawer === 'settings' ? <>
        <ContactsSection />
        <View style={styles.account}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Account</Text>
          {session?.user.email ? <Text style={styles.accountEmail}>Signed in as {session.user.email}</Text> : null}
          {signOutError ? <Text accessibilityRole="alert" style={styles.error}>{signOutError}</Text> : null}
          <Button label="Sign out" variant="danger" fullWidth loading={signingOut} onPress={() => { void signOut(); }} />
        </View>
      </> : null}
    </ProfileDrawer>
  </>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    content: { marginTop: theme.spacing[6], gap: theme.spacing[4] },
    actions: { flexDirection: 'row', gap: theme.spacing[3] },
    subtitle: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
    friendsButton: { flex: 1, alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[5], minHeight: theme.sizes.touchTarget, backgroundColor: theme.colors.accentSubtle, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.borderSubtle },
    settingsButton: { flex: 1, alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[5], minHeight: theme.sizes.touchTarget, backgroundColor: theme.colors.bgSurface, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.borderSubtle },
    icon: { padding: theme.spacing[2], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bgSurface },
    rowText: { gap: theme.spacing[1], alignItems: 'center' },
    rowTitle: { ...theme.typography.bodyStrong, color: theme.colors.textPrimary },
    badge: { position: 'absolute', top: theme.spacing[3], right: theme.spacing[3], minWidth: theme.spacing[6], minHeight: theme.spacing[6], paddingHorizontal: theme.spacing[2], alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full, backgroundColor: theme.colors.accentStrong },
    badgeText: { ...theme.typography.caption, color: theme.colors.onAccent },
    pressed: { opacity: 0.75 },
    account: { gap: theme.spacing[3], borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle, paddingTop: theme.spacing[4] },
    sectionTitle: { ...theme.typography.h4, color: theme.colors.textPrimary },
    accountEmail: { ...theme.typography.caption, color: theme.colors.textTertiary },
    error: { ...theme.typography.bodySm, color: theme.colors.danger },
  });
}
