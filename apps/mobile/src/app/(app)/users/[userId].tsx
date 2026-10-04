import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProfileIdentity } from '@/components/profile/ProfileIdentity';
import { BackButton } from '@/components/ui/BackButton';
import { CopyButton } from '@/components/ui/CopyButton';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadState } from '@/components/ui/LoadState';
import { Screen } from '@/components/ui/Screen';
import { useFocusedData } from '@/hooks/useFocusedData';
import { CONTACTS, formatContact, getUser } from '@/lib/contacts';
import { useTheme, type Theme } from '@/theme';
import type { Contact } from '@/types';

export default function UserScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const theme = useTheme();
  const styles = createStyles(theme);
  const loader = useCallback(() => getUser(userId), [userId]);
  const { data: user, loading, refreshing, error, refresh, retry } = useFocusedData(
    loader,
    'Could not load this profile.',
  );

  if (!user) {
    return (
      <Screen title="Profile" headerLeft={<BackButton />} headerRight={<View />}>
        <View style={styles.content}>
          <LoadState loading={loading} error={error} fallbackError="Could not load this profile." onRetry={retry} />
        </View>
      </Screen>
    );
  }

  const name = user.username ? `@${user.username}` : 'This person';

  return (
    <Screen
      title="Profile"
      onRefresh={refresh}
      refreshing={refreshing}
      headerLeft={<BackButton />}
      headerRight={<View />}
    >
      <View style={styles.content}>
        <ProfileIdentity username={user.username} avatarColor={user.avatar_color} />
        <ListGroup
          title="Contact info"
          count={user.contacts.length}
          emptyText={`${name} hasn't shared any contact info.`}
        >
          {user.contacts.map((contact) => (
            <ContactRow key={contact.kind} contact={contact} />
          ))}
        </ListGroup>
      </View>
    </Screen>
  );
}

/**
 * A shared contact. Social handles and WhatsApp open in their app; e-transfer
 * details get a copy button on the trailing edge.
 */
function ContactRow({ contact }: { contact: Contact }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [focused, setFocused] = useState(false);
  const meta = CONTACTS[contact.kind];
  const value = formatContact(contact.kind, contact.value);
  const url = meta.url?.(contact.value);
  const copyable = contact.kind === 'etransfer_email' || contact.kind === 'etransfer_phone';

  const text = (
    <View style={styles.text}>
      <Text style={styles.label}>{meta.label}</Text>
      <Text style={styles.value} selectable>
        {value}
      </Text>
    </View>
  );

  const main = url ? (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => Alert.alert(`Could not open ${meta.label}`))}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="link"
      accessibilityLabel={`${meta.label}, ${value}`}
      accessibilityHint={`Opens ${meta.label}`}
      style={({ pressed }) => [styles.main, pressed && styles.pressed, focused && styles.focused]}
    >
      {text}
      <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
        ›
      </Text>
    </Pressable>
  ) : (
    <View style={styles.main} accessible accessibilityLabel={`${meta.label}, ${value}`}>
      {text}
    </View>
  );

  return (
    <View style={styles.row}>
      {main}
      {copyable ? <CopyButton value={contact.value} label={meta.label} /> : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    content: {
      marginTop: theme.spacing[6],
      gap: theme.spacing[8],
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    main: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      minHeight: theme.sizes.touchTarget,
      paddingVertical: theme.spacing[3],
      paddingHorizontal: theme.spacing[2],
      borderRadius: theme.radius.md,
      borderWidth: theme.sizes.borderWidth,
      borderColor: 'transparent',
    },
    pressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    focused: {
      borderColor: theme.colors.borderFocus,
    },
    text: {
      flex: 1,
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    value: {
      ...theme.typography.bodyStrong,
      color: theme.colors.textPrimary,
    },
    chevron: {
      ...theme.typography.h4,
      color: theme.colors.textTertiary,
    },
  });
}
