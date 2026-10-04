import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useTheme, type Theme } from '@/theme';
import type { AvatarColor } from '@/types';

type Props = {
  username: string;
  /** iOS system accent for their initials avatar. */
  avatarColor?: AvatarColor | null;
  subtitle?: string;
  /** Buttons shown on the trailing edge; wraps below the name on narrow screens. */
  actions?: ReactNode;
  /** Makes the name tappable, e.g. to open their profile. */
  onPress?: () => void;
};

export function FriendRow({ username, avatarColor, subtitle, actions, onPress }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [focused, setFocused] = useState(false);
  const label = subtitle ? `@${username}, ${subtitle}` : `@${username}`;
  const identity = (
    <>
      <Avatar name={username} color={avatarColor} />
      <View style={styles.text}>
        <Text style={styles.username} numberOfLines={1}>
          @{username}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Opens their profile"
          style={({ pressed }) => [
            styles.identity,
            styles.pressable,
            pressed && styles.pressed,
            focused && styles.focused,
          ]}
        >
          {identity}
        </Pressable>
      ) : (
        <View style={styles.identity} accessible accessibilityLabel={label}>
          {identity}
        </View>
      )}
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
    pressable: {
      minHeight: theme.sizes.touchTarget,
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
