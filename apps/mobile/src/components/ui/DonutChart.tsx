import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { useTheme, type Theme } from '@/theme';

export type DonutSegment = { key: string; value: number; color: string };

type Props = {
  segments: DonutSegment[];
  /** Read by screen readers instead of the drawing. Describe every segment in text. */
  accessibilityLabel: string;
  /** Controlled selection (press / legend). `null` = none. */
  selectedIndex?: number | null;
  onSelectChange?: (index: number | null) => void;
  /** Centered inside the ring, e.g. the total or selected slice. */
  children?: ReactNode;
};

/**
 * Donut chart via react-native-gifted-charts, themed to our tokens.
 * Press a slice (or drive selection from a legend) to focus it.
 * Fades/scales in on load (gifted PieChart’s built-in `isAnimated` only works on PieChartPro).
 */
export function DonutChart({
  segments,
  accessibilityLabel,
  selectedIndex = null,
  onSelectChange,
  children,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const hoverOffset = theme.sizes.donutHoverOffset;
  const radius = theme.sizes.donut / 2 - hoverOffset;
  const innerRadius = Math.max(radius - theme.sizes.donutStroke, 0);
  const focusedIndex = selectedIndex ?? -1;
  const appear = useRef(new Animated.Value(0)).current;
  const dataKey = segments.map((segment) => `${segment.key}:${segment.value}`).join('|');

  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, {
      toValue: 1,
      duration: theme.motion.duration.slow,
      easing: Easing.bezier(...theme.motion.easeTab),
      useNativeDriver: true,
    }).start();
  }, [appear, dataKey, theme.motion.duration.slow, theme.motion.easeTab]);

  const data = segments.map((segment, index) => ({
    value: Math.max(segment.value, 0),
    color: segment.color,
    focused: focusedIndex === index,
    onPress: () => {
      if (!onSelectChange) return;
      onSelectChange(focusedIndex === index ? null : index);
    },
  }));

  return (
    <View
      style={styles.chart}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={{
          opacity: appear,
          transform: [
            {
              scale: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [0.88, 1],
              }),
            },
          ],
        }}
      >
        <PieChart
          data={data}
          donut
          radius={radius}
          innerRadius={innerRadius}
          extraRadius={hoverOffset}
          focusOnPress
          toggleFocusOnPress
          selectedIndex={focusedIndex}
          setSelectedIndex={(index: number) => {
            onSelectChange?.(index < 0 ? null : index);
          }}
          innerCircleColor={theme.colors.bgSurface}
          backgroundColor="transparent"
          strokeWidth={theme.sizes.donutGap}
          strokeColor={theme.colors.bgSurface}
          edgesRadius={theme.radius.sm}
          centerLabelComponent={() => (
            <View style={styles.center} pointerEvents="none">
              {children}
            </View>
          )}
        />
      </Animated.View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    chart: {
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[2],
      maxWidth: theme.sizes.donut - theme.sizes.donutStroke * 2,
    },
  });
}
