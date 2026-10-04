import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useTheme, type Theme } from '@/theme';

type Props = {
  value: string;
  /** What is being copied, e.g. "E-transfer email". Read as "Copy E-transfer email". */
  label: string;
  /** Set inside drawers / native modals so the confirmation toast shows above them. */
  overModal?: boolean;
};

/** Icon button that copies `value` and confirms with a snackbar. */
export function CopyButton({ value, label, overModal }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { showSnackbar } = useSnackbar();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}`}
      hitSlop={theme.spacing[3]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => {
        void Clipboard.setStringAsync(value).then(() => {
          showSnackbar({ message: 'Copied to clipboard.', variant: 'success', overModal });
        });
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, focused && styles.focused]}
    >
      <SFSymbolIcon name="doc.on.doc" size={theme.sizes.iconMd} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      padding: theme.spacing[1],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      borderWidth: theme.sizes.borderWidth,
      borderColor: 'transparent',
    },
    pressed: {
      opacity: theme.opacity.disabled,
    },
    focused: {
      borderColor: theme.colors.borderFocus,
    },
  });
}
