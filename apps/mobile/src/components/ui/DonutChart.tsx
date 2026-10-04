import { useEffect, useRef, useState, type ReactNode } from 'react';
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
 * Optional press/legend selection when `onSelectChange` is provided.
 * Sweeps in on load by growing slices against a shrinking surface-colored gap
 * (gifted PieChart has no built-in fill animation; PieChartPro only animates
 * when no slice is larger than half).
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
  const interactive = onSelectChange != null;
  const hoverOffset = interactive ? theme.sizes.donutHoverOffset : 0;
  const radius = theme.sizes.donut / 2 - (interactive ? theme.sizes.donutHoverOffset : 0);
  const innerRadius = Math.max(radius - theme.sizes.donutStroke, 0);
  const focusedIndex = interactive ? (selectedIndex ?? -1) : -1;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const [fill, setFill] = useState(0);
  const dataKey = segments.map((segment) => `${segment.key}:${segment.value}`).join('|');
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);

  useEffect(() => {
    fillAnim.setValue(0);
    setFill(0);
    const listener = fillAnim.addListener(({ value }) => setFill(value));
    Animated.timing(fillAnim, {
      toValue: 1,
      duration: theme.motion.duration.slow,
      easing: Easing.bezier(...theme.motion.easeTab),
      useNativeDriver: false,
    }).start();
    return () => {
      fillAnim.removeListener(listener);
    };
  }, [dataKey, fillAnim, theme.motion.duration.slow, theme.motion.easeTab]);

  const filled = fill >= 0.999;
  const data = [
    ...segments
      .map((segment, index) => ({
        value: Math.max(segment.value, 0) * fill,
        color: segment.color,
        focused: filled && focusedIndex === index,
        ...(interactive && filled
          ? {
              onPress: () => {
                onSelectChange(focusedIndex === index ? null : index);
              },
            }
          : {}),
      }))
      .filter((segment) => segment.value > 0),
    ...(!filled && total > 0
      ? [{ value: total * (1 - fill), color: theme.colors.bgSurface }]
      : []),
  ];

  return (
    <View
      style={styles.chart}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <PieChart
        data={data}
        donut
        radius={radius}
        innerRadius={innerRadius}
        extraRadius={hoverOffset}
        focusOnPress={interactive && filled}
        toggleFocusOnPress={interactive && filled}
        selectedIndex={filled ? focusedIndex : -1}
        setSelectedIndex={
          interactive && filled
            ? (index: number) => {
                onSelectChange(index < 0 ? null : index);
              }
            : undefined
        }
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
