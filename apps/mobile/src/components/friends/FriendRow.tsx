import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useTheme, type Theme } from '@/theme';

type Props = {
  username: string;
  subtitle?: string;
  /** Buttons shown on the trailing edge; wraps below the name on narrow screens. */
  actions?: ReactNode;
};

export function FriendRow({ username, subtitle, actions }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.row}>
      <View
        style={styles.identity}
        accessible
        accessibilityLabel={subtitle ? `@${username}, ${subtitle}` : `@${username}`}
      >
        <Avatar name={username} />
        <View style={styles.text}>
          <Text style={styles.username} numberOfLines={1}>
            @{username}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: theme.spacing[3],
      paddingVertical: theme.spacing[3],
      borderBottomWidth: theme.sizes.borderWidth,
      borderBottomColor: theme.colors.borderSubtle,
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      flexGrow: 1,
      flexShrink: 1,
      minWidth: '50%',
    },
    text: {
      flexShrink: 1,
    },
    username: {
      ...theme.typography.bodyStrong,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing[2],
    },
  });
}
