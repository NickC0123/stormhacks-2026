import { Picker } from '@react-native-picker/picker';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useTheme, type Theme } from '@/theme';

export type NativeSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T | null;
  options: NativeSelectOption<T>[];
  onChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
  style?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
};

/**
 * Field trigger that opens a native wheel picker in a bottom sheet
 * (same interaction model as the date/time spinner).
 */
export function NativeSelect<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  disabled = false,
  placeholder = 'Select',
  title = 'Select',
  style,
  triggerStyle,
}: Props<T>) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<T>(value ?? options[0]?.value);
  const selected = value == null ? undefined : options.find((option) => option.value === value);
  const isPlaceholder = !selected;
  const label = selected?.label ?? placeholder;

  function openSheet() {
    if (disabled) return;
    setDraft(value ?? options[0]?.value);
    setOpen(true);
  }

  function confirm() {
    if (draft != null) onChange(draft);
    setOpen(false);
  }

  return (
    <>
      <View style={style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Opens a native picker"
          accessibilityState={{ disabled, expanded: open }}
          disabled={disabled}
          onPress={openSheet}
          style={({ pressed }) => [
            styles.trigger,
            triggerStyle,
            pressed && !disabled && styles.triggerPressed,
            disabled && styles.triggerDisabled,
          ]}
        >
          <Text style={[styles.triggerText, isPlaceholder && styles.triggerPlaceholder]} numberOfLines={1}>
            {label}
          </Text>
          <SFSymbolIcon name="chevron.down" size={theme.sizes.iconSm} color={theme.colors.textTertiary} />
        </Pressable>
      </View>

      <PickerSheet
        visible={open}
        title={title}
        selectedValue={draft}
        options={options}
        onValueChange={setDraft}
        onCancel={() => setOpen(false)}
        onDone={confirm}
      />
    </>
  );
}

function PickerSheet<T extends string>({
  visible,
  title,
  selectedValue,
  options,
  onValueChange,
  onCancel,
  onDone,
}: {
  visible: boolean;
  title: string;
  selectedValue: T;
  options: NativeSelectOption<T>[];
  onValueChange: (value: T) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const progress = useRef(new Animated.Value(0)).current;
  const wasOpen = useRef(false);
  const closingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const [x1, y1, x2, y2] = theme.motion.easeTab;
    const easing = Easing.bezier(x1, y1, x2, y2);

    if (visible) {
      wasOpen.current = true;
      closingRef.current = false;
      setMounted(true);
      if (reduceMotion) {
        progress.setValue(1);
        return;
      }
      progress.setValue(0);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: theme.motion.modal.openDur,
        easing,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }

    if (!wasOpen.current) return;

    if (reduceMotion) {
      progress.setValue(0);
      wasOpen.current = false;
      closingRef.current = false;
      setMounted(false);
      return;
    }

    closingRef.current = true;
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: theme.motion.modal.closeDur,
      easing,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      wasOpen.current = false;
      closingRef.current = false;
      setMounted(false);
    });
    return () => anim.stop();
  }, [visible, reduceMotion, theme, progress]);

  function requestClose() {
    if (closingRef.current || !wasOpen.current) return;
    onCancel();
  }

  if (!mounted) return null;

  const sheetTravel = theme.sizes.dateTimePicker + theme.sizes.touchTarget + theme.spacing[8];

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={requestClose}>
      <View style={styles.sheetRoot}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]} pointerEvents="none" />
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={requestClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetTravel, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={requestClose}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.sheetActionPressed]}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={onDone}
              style={({ pressed }) => [styles.sheetAction, pressed && styles.sheetActionPressed]}
            >
              <Text style={styles.sheetDoneText}>Done</Text>
            </Pressable>
          </View>
          <Picker
            selectedValue={selectedValue}
            onValueChange={(next) => onValueChange(next as T)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {options.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
                color={theme.colors.textPrimary}
              />
            ))}
          </Picker>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: theme.sizes.touchTarget,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[3],
      gap: theme.spacing[2],
      backgroundColor: theme.colors.bgSurface,
    },
    triggerPressed: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    triggerDisabled: {
      opacity: theme.opacity.disabled,
    },
    triggerText: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 16,
      letterSpacing: -0.48,
      flex: 1,
      color: theme.colors.textPrimary,
    },
    triggerPlaceholder: {
      color: theme.colors.textTertiary,
    },
    sheetRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      // Match create-action / date-picker overlay tone.
      backgroundColor: 'rgba(41, 41, 58, 0.23)',
    },
    sheet: {
      backgroundColor: theme.colors.navBar,
      borderTopLeftRadius: theme.radius.sheet,
      borderTopRightRadius: theme.radius.sheet,
      paddingBottom: theme.spacing[6],
      paddingHorizontal: theme.spacing[4],
      ...theme.shadows.nav,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: theme.sizes.touchTarget,
      paddingTop: theme.spacing[3],
    },
    sheetTitle: {
      ...theme.typography.body,
      fontFamily: theme.fonts.sans.semibold,
      color: theme.colors.textPrimary,
    },
    sheetAction: {
      minHeight: theme.sizes.touchTarget,
      minWidth: theme.spacing[16],
      justifyContent: 'center',
    },
    sheetActionPressed: {
      opacity: 0.7,
    },
    sheetCancelText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    sheetDoneText: {
      ...theme.typography.body,
      fontFamily: theme.fonts.sans.semibold,
      color: theme.colors.accentStrong,
      textAlign: 'right',
    },
    picker: {
      width: '100%',
      height: theme.sizes.dateTimePicker,
      alignSelf: 'center',
    },
    pickerItem: {
      fontSize: 20,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      ...(Platform.OS === 'ios' ? { height: theme.sizes.dateTimePicker } : null),
    },
  });
}
