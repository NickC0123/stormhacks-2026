import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme, type Theme } from '@/theme';

type Props = {
  /** Placeholder row count. */
  rows?: number;
  /** 2 matches event expense rows; 3 matches the main expenses tab. */
  lines?: 2 | 3;
};

/** Expense-row-shaped skeletons for list loading states. */
export function ExpenseListSkeleton({ rows = 4, lines = 2 }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const titleH = theme.typography.body.lineHeight ?? theme.spacing[6];
  const metaH = theme.typography.bodySm.lineHeight ?? theme.spacing[5];

  return (
    <SkeletonGroup accessibilityLabel="Loading expenses" style={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton width="55%" height={titleH} radius="sm" />
          <Skeleton width="80%" height={metaH} radius="sm" />
          {lines === 3 ? <Skeleton width="45%" height={metaH} radius="sm" /> : null}
        </View>
      ))}
    </SkeletonGroup>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: theme.spacing[3],
    },
    row: {
      padding: theme.spacing[4],
      borderRadius: theme.radius.lg,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.bgSurface,
      gap: theme.spacing[1.5],
    },
  });
}
