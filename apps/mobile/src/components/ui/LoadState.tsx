import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme, type Theme } from '@/theme';

type Props = {
  loading: boolean;
  error: string | null;
  fallbackError: string;
  onRetry: () => void;
  /** Card/list-shaped placeholder while loading. Defaults to compact text bones. */
  skeleton?: ReactNode;
};

/** Skeleton while loading, otherwise an error message with a retry button. */
export function LoadState({ loading, error, fallbackError, onRetry, skeleton }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  if (loading) {
    return skeleton ?? <DefaultLoadSkeleton />;
  }
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{error ?? fallbackError}</Text>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

function DefaultLoadSkeleton() {
  const theme = useTheme();
  const line = theme.typography.body.lineHeight ?? theme.spacing[5];
  return (
    <SkeletonGroup accessibilityLabel="Loading" style={{ gap: theme.spacing[2] }}>
      <Skeleton width="70%" height={line} radius="sm" />
      <Skeleton width="90%" height={line} radius="sm" />
      <Skeleton width="55%" height={line} radius="sm" />
    </SkeletonGroup>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    error: {
      alignItems: 'flex-start',
      gap: theme.spacing[2],
    },
    errorText: {
      ...theme.typography.bodySm,
      color: theme.colors.danger,
    },
  });
}
