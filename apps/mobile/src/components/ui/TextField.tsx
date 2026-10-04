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
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {/* Use the same native text metrics as the editable value so prefixes share its baseline. */}
            <TextInput
              value={prefix}
              editable={false}
              caretHidden
              contextMenuHidden
              accessible={false}
              autoComplete="off"
              underlineColorAndroid="transparent"
              style={[styles.inputText, styles.prefix]}
            />
          </View>
        ) : null}
        <TextInput
          {...inputProps}
          editable={!disabled}
          underlineColorAndroid="transparent"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel={prefix ? `${label}, prefix ${prefix}` : label}
          accessibilityHint={message ?? undefined}
          accessibilityState={{ disabled }}
          style={[styles.inputText, styles.input, disabled && styles.inputDisabled]}
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
      minHeight: theme.sizes.touchTarget,
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
    inputText: {
      fontFamily: theme.typography.body.fontFamily,
      fontSize: theme.typography.body.fontSize,
      minHeight: theme.sizes.touchTarget,
      paddingHorizontal: 0,
      paddingVertical: theme.spacing[2],
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    prefix: {
      color: theme.colors.textSecondary,
    },
    input: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.textPrimary,
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
