import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useTheme, type Theme } from '@/theme';

type Props = {
  loading: boolean;
  error: string | null;
  fallbackError: string;
  onRetry: () => void;
};

/** Spinner while loading, otherwise an error message with a retry button. */
export function LoadState({ loading, error, fallbackError, onRetry }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  if (loading) {
    return <ActivityIndicator color={theme.colors.textTertiary} style={styles.loading} />;
  }
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{error ?? fallbackError}</Text>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    loading: {
      alignSelf: 'flex-start',
    },
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
