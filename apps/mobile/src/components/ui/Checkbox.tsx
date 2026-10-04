import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme, type Theme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/**
 * Rounded transitions.dev-style checkbox: box fills, then the check stroke draws in.
 */
export function Checkbox({ checked, onChange, accessibilityLabel, disabled }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const reduceMotion = useRef(false);
  const fill = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const dash = useRef(
    new Animated.Value(checked ? 0 : theme.sizes.checkboxPathLen),
  ).current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) reduceMotion.current = enabled;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotion.current = enabled;
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const easing = Easing.bezier(...theme.motion.easeTab);
    const len = theme.sizes.checkboxPathLen;

    if (reduceMotion.current) {
      fill.setValue(checked ? 1 : 0);
      dash.setValue(checked ? 0 : len);
      return;
    }

    if (checked) {
      Animated.timing(fill, {
        toValue: 1,
        duration: theme.motion.check.box,
        easing,
        useNativeDriver: false,
      }).start();
      Animated.timing(dash, {
        toValue: 0,
        duration: theme.motion.check.draw,
        delay: theme.motion.check.delay,
        easing,
        useNativeDriver: false,
      }).start();
      return;
    }

    Animated.parallel([
      Animated.timing(dash, {
        toValue: len,
        duration: theme.motion.check.uncheck,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(fill, {
        toValue: 0,
        duration: theme.motion.check.box,
        easing,
        useNativeDriver: false,
      }),
    ]).start();
  }, [checked, dash, fill, theme]);

  const bg = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.bgSurface, theme.colors.accent],
  });
  const border = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.borderDefault, theme.colors.accent],
  });

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={theme.spacing[2]}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.hit, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.box, { backgroundColor: bg, borderColor: border }]}>
        <View style={styles.icon}>
          <Svg width="100%" height="100%" viewBox="0 0 10.1668 10.1668">
            <AnimatedPath
              d="M1 5.52L3.92 9.17L9.17 1"
              stroke={theme.colors.onAccent}
              strokeWidth={theme.sizes.checkboxStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={`${theme.sizes.checkboxPathLen}, ${theme.sizes.checkboxPathLen}`}
              strokeDashoffset={dash}
            />
          </Svg>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    hit: {
      minWidth: theme.sizes.touchTarget,
      minHeight: theme.sizes.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    box: {
      width: theme.sizes.checkbox,
      height: theme.sizes.checkbox,
      borderRadius: theme.radius.full,
      borderWidth: theme.sizes.borderWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      width: theme.spacing[3],
      height: theme.spacing[3],
    },
    pressed: {
      transform: [{ scale: 0.96 }],
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
  });
}
