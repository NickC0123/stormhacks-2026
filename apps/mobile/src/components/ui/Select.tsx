import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useTheme, type Theme } from '@/theme';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

type Anchor = { x: number; y: number; width: number; height: number };

type Props<T extends string> = {
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
};

/** Combobox-style select with an anchored popover menu (design-spec §6.3). */
export function Select<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  disabled = false,
  placeholder,
  style,
  triggerStyle,
}: Props<T>) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const triggerRef = useRef<View>(null);
  const triggerLayout = useRef({ width: 0, height: 0 });
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [backdropArmed, setBackdropArmed] = useState(false);

  const selected = value == null ? undefined : options.find((option) => option.value === value);
  const isPlaceholder = !selected;
  const label = selected?.label ?? placeholder ?? '';

  useEffect(() => {
    if (!open) {
      setBackdropArmed(false);
      return;
    }
    const timer = setTimeout(() => setBackdropArmed(true), theme.motion.duration.fast);
    return () => clearTimeout(timer);
  }, [open, theme.motion.duration.fast]);

  function close() {
    setOpen(false);
    setAnchor(null);
  }

  function openMenu() {
    if (disabled) return;
    const node = triggerRef.current;
    if (!node) return;

    node.measureInWindow((x, y, width, height) => {
      // Nested modals / Pressable refs often return 0×0 — never allow that or the
      // menu top collapses onto the field top (y + 0).
      const measuredHeight = Math.max(
        height,
        triggerLayout.current.height,
        theme.sizes.controlMd,
      );
      const measuredWidth = Math.max(
        width,
        triggerLayout.current.width,
        theme.sizes.dropdownMinWidth,
      );
      setAnchor({ x, y, width: measuredWidth, height: measuredHeight });
      setOpen(true);
    });
  }

  function select(next: T) {
    onChange(next);
    close();
  }

  const gap = theme.spacing[0.5];
  const menuWidth = anchor ? Math.max(anchor.width, theme.sizes.dropdownMinWidth) : theme.sizes.dropdownMinWidth;
  // Explicitly below the field: top edge of menu = bottom edge of field + 2px.
  const menuTop = anchor ? anchor.y + anchor.height + gap : 0;
  const maxMenuHeight = anchor
    ? Math.min(
        theme.sizes.dropdownMaxHeight,
        Math.max(windowHeight - menuTop - theme.spacing[4], theme.sizes.touchTarget),
      )
    : theme.sizes.dropdownMaxHeight;
  const menuLeft = anchor
    ? Math.min(Math.max(theme.spacing[4], anchor.x), windowWidth - menuWidth - theme.spacing[4])
    : 0;

  return (
    <>
      <View
        ref={triggerRef}
        collapsable={false}
        style={style}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          triggerLayout.current = { width, height };
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Opens a list of options"
          accessibilityState={{ disabled, expanded: open }}
          disabled={disabled}
          onPress={openMenu}
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

      <Modal
        transparent
        visible={open}
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss options"
            style={StyleSheet.absoluteFill}
            onPress={backdropArmed ? close : undefined}
          />
          {anchor ? (
            <View
              accessibilityRole="menu"
              pointerEvents="box-none"
              style={[
                styles.menu,
                {
                  top: menuTop,
                  left: menuLeft,
                  width: menuWidth,
                },
              ]}
            >
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
                persistentScrollbar
                indicatorStyle={theme.scheme === 'dark' ? 'white' : 'black'}
                style={[styles.menuScroll, { maxHeight: maxMenuHeight }]}
              >
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={option.label}
                      onPress={() => select(option.value)}
                      style={({ pressed }) => [
                        styles.option,
                        (pressed || isSelected) && styles.optionActive,
                      ]}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]} numberOfLines={1}>
                        {option.label}
                      </Text>
                      {isSelected ? (
                        <SFSymbolIcon name="checkmark" size={theme.sizes.iconSm} color={theme.colors.accentStrong} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: theme.sizes.controlMd,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing[3],
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
    menu: {
      position: 'absolute',
      backgroundColor: theme.colors.bgElevated,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.lg,
      padding: theme.spacing[1],
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    menuScroll: {
      flexGrow: 0,
    },
    option: {
      minHeight: theme.sizes.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing[3],
      borderRadius: theme.radius.sm,
      gap: theme.spacing[2],
    },
    optionActive: {
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
    optionText: {
      ...theme.typography.bodySm,
      flex: 1,
      color: theme.colors.textPrimary,
    },
    optionTextSelected: {
      fontFamily: theme.fonts.sans.medium,
    },
  });
}
