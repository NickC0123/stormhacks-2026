import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme, type Theme } from '@/theme';

export type DonutSegment = { key: string; value: number; color: string };

type Props = {
  segments: DonutSegment[];
  /** Read by screen readers instead of the drawing. Describe every segment in text. */
  accessibilityLabel: string;
  /** Centered inside the ring, e.g. the total. */
  children?: ReactNode;
};

/** Ring chart of positive values. Colors must also be explained by a text legend. */
export function DonutChart({ segments, accessibilityLabel, children }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { donut: size, donutStroke: stroke, donutGap } = theme.sizes;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  const gap = segments.length > 1 ? donutGap : 0;

  let offset = 0;
  const arcs = total > 0 ? segments.filter((segment) => segment.value > 0).map((segment) => {
    const length = (segment.value / total) * circumference;
    const arc = { ...segment, offset, visible: Math.max(length - gap, 0) };
    offset += length;
    return arc;
  }) : [];

  return (
    <View style={styles.chart} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.colors.borderSubtle} strokeWidth={stroke} fill="none" />
          {arcs.map((arc) => (
            <Circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={arc.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${arc.visible} ${circumference - arc.visible}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </G>
      </Svg>
      {children ? <View style={styles.center} pointerEvents="none">{children}</View> : null}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    chart: {
      width: theme.sizes.donut,
      height: theme.sizes.donut,
      alignSelf: 'center',
    },
    center: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.sizes.donutStroke + theme.spacing[1],
    },
  });
}
