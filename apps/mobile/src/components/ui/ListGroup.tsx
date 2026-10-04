import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  title: string;
  /** Shown after the title as "Title · 3". */
  count?: number;
  /** Shown instead of children when there are no rows. */
  emptyText?: string;
  children?: ReactNode;
};

/** Titled group of list rows. */
export function ListGroup({ title, count, emptyText, children }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const isEmpty = count === 0 && emptyText;

  return (
    <View style={styles.group}>
      <Text style={styles.title} accessibilityRole="header">
        {count === undefined ? title : `${title} · ${count}`}
      </Text>
      {isEmpty ? <Text style={styles.empty}>{emptyText}</Text> : <View>{children}</View>}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    group: {
      gap: theme.spacing[2],
    },
    title: {
      ...theme.typography.button,
      color: theme.colors.textSecondary,
    },
    empty: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
  });
}
