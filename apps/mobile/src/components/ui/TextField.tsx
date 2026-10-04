import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'autoFocus'
  | 'keyboardType'
  | 'maxLength'
  | 'onSubmitEditing'
  | 'returnKeyType'
  | 'textContentType'
> & {
  label: string;
  /** Fixed text shown before the input, e.g. "@". */
  prefix?: string;
  helper?: string;
  error?: string | null;
  disabled?: boolean;
};

/** Design-spec text input with label, helper, and error text (section 6.2). */
export function TextField({ label, prefix, helper, error, disabled = false, ...inputProps }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [focused, setFocused] = useState(false);
  const message = error || helper;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.control,
          focused && styles.controlFocused,
          error ? styles.controlError : null,
          disabled && styles.controlDisabled,
        ]}
      >
        {prefix ? (
          <Text style={styles.prefix} accessibilityElementsHidden importantForAccessibility="no">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...inputProps}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel={label}
          accessibilityHint={message ?? undefined}
          accessibilityState={{ disabled }}
          style={[styles.input, disabled && styles.inputDisabled]}
        />
      </View>
      {message ? (
        <Text
          style={[styles.message, error ? styles.messageError : null]}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    field: {
      gap: theme.spacing[2],
    },
    label: {
      ...theme.typography.button,
      color: theme.colors.textPrimary,
    },
    control: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: theme.sizes.controlMd,
      paddingHorizontal: theme.spacing[3],
      gap: theme.spacing[1],
      backgroundColor: theme.colors.bgSurface,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.md,
    },
    controlFocused: {
      borderColor: theme.colors.borderFocus,
    },
    controlError: {
      borderColor: theme.colors.danger,
    },
    controlDisabled: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    prefix: {
      ...theme.typography.body,
      color: theme.colors.textTertiary,
    },
    input: {
      flex: 1,
      ...theme.typography.body,
      color: theme.colors.textPrimary,
      paddingVertical: theme.spacing[2],
    },
    inputDisabled: {
      color: theme.colors.textDisabled,
    },
    message: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
    },
    messageError: {
      color: theme.colors.danger,
    },
  });
}
