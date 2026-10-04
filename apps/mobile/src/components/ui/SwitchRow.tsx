import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Defaults to `label`; set when the label alone is ambiguous in a list. */
  accessibilityLabel?: string;
};

/** A label with an on/off switch on the trailing edge. */
export function SwitchRow({ label, value, onValueChange, disabled = false, accessibilityLabel }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.borderDefault, true: theme.colors.accent }}
        thumbColor={theme.colors.bgSurface}
        ios_backgroundColor={theme.colors.borderDefault}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ checked: value, disabled }}
      />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing[3],
      minHeight: theme.sizes.touchTarget,
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
    label: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
  });
}
