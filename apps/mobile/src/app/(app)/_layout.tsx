import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ProfileProvider, useProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { useTheme, type Theme } from '@/theme';

export default function AppLayout() {
  return (
    <ProfileProvider>
      <AppNavigator />
    </ProfileProvider>
  );
}

function AppNavigator() {
  const { profile, loading, error, reload } = useProfile();
  const theme = useTheme();
  const styles = createStyles(theme);

  if (!profile) {
    return (
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator color={theme.colors.textTertiary} />
        ) : (
          <>
            <Text style={styles.title}>Couldn’t load your profile</Text>
            {error ? <Text style={styles.message}>{error}</Text> : null}
            <Button label="Try again" onPress={reload} />
            <Button label="Sign out" variant="ghost" onPress={() => supabase.auth.signOut()} />
          </>
        )}
      </View>
    );
  }

  const hasUsername = Boolean(profile.username);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasUsername}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="events/new"
          options={{
            presentation: 'modal',
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgSurface },
          }}
        />
        <Stack.Screen
          name="expenses/new"
          options={{
            presentation: 'modal',
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgSurface },
          }}
        />
        <Stack.Screen
          name="archive"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgPage },
          }}
        />
        <Stack.Screen
          name="expenses/[expenseId]"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgSurface },
          }}
        />
        <Stack.Screen
          name="users/[userId]"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgPage },
          }}
        />
        <Stack.Screen
          name="events/[eventId]/edit"
          options={{
            presentation: 'modal',
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgSurface },
          }}
        />
        <Stack.Screen
          name="events/[eventId]/index"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgPage },
          }}
        />
        <Stack.Screen
          name="events/[eventId]/invite"
          options={{
            presentation: 'modal',
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgSurface },
          }}
        />
        <Stack.Screen
          name="events/[eventId]/memories"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgPage },
          }}
        />
        <Stack.Screen
          name="events/[eventId]/receipts/[receiptId]"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgPage },
          }}
        />
        <Stack.Screen
          name="events/[eventId]/receipts/scan"
          options={{
            presentation: 'modal',
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bgSurface },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!hasUsername}>
        <Stack.Screen name="choose-username" />
      </Stack.Protected>
    </Stack>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[3],
      padding: theme.spacing[6],
      backgroundColor: theme.colors.bgPage,
    },
    title: {
      ...theme.typography.h4,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    message: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
}
