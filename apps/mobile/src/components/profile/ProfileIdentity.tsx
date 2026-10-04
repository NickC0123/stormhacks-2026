import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useTheme, type Theme } from '@/theme';
import type { AvatarColor } from '@/types';

type Props = {
  username: string | null;
  avatarColor?: AvatarColor | null;
};

/** Profile header: large avatar with the @username under it. Used for your own and friends' profiles. */
export function ProfileIdentity({ username, avatarColor }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const handle = username ? `@${username}` : 'Unknown user';

  return (
    <View style={styles.identity}>
      <Avatar name={username ?? '?'} color={avatarColor} size="xl" />
      <Text style={styles.username} accessibilityRole="header">{handle}</Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    identity: {
      alignItems: 'center',
      gap: theme.spacing[2],
      paddingVertical: theme.spacing[6],
      marginBottom: theme.spacing[3],
    },
    username: {
      ...theme.typography.h2,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
  });
}
