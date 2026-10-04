import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Radius = keyof Theme['radius'];

type Props = {
  width?: DimensionValue;
  height: number;
  /** Theme radius key. Defaults to `md`. */
  radius?: Radius;
  style?: StyleProp<ViewStyle>;
};

/**
 * Surface-alt bone with a subtle opacity shimmer (design-spec §6.17).
 * Shimmer is disabled when Reduce Motion is on.
 */
export function Skeleton({ width = '100%', height, radius = 'md', style }: Props) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(theme.opacity.skeletonMax)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const styles = createBoneStyles(theme, width, height, radius);

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
    if (reduceMotion) {
      pulse.setValue(theme.opacity.skeletonMax);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: theme.opacity.skeletonMin,
          duration: theme.motion.duration.skeleton,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: theme.opacity.skeletonMax,
          duration: theme.motion.duration.skeleton,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion, theme]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bone, { opacity: pulse }, style]}
    />
  );
}

type GroupProps = {
  children: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Wrapper that announces loading to assistive tech. */
export function SkeletonGroup({
  children,
  accessibilityLabel = 'Loading',
  style,
}: GroupProps) {
  const theme = useTheme();
  const styles = createGroupStyles(theme);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      style={[styles.group, style]}
    >
      {children}
    </View>
  );
}

function createBoneStyles(
  theme: Theme,
  width: DimensionValue,
  height: number,
  radius: Radius,
) {
  return StyleSheet.create({
    bone: {
      width,
      height,
      borderRadius: theme.radius[radius],
      backgroundColor: theme.colors.bgSurfaceAlt,
    },
  });
}

function createGroupStyles(theme: Theme) {
  return StyleSheet.create({
    group: {
      gap: theme.spacing[3],
    },
  });
}
