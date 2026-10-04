import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/theme';

type TitleVariant = 'default' | 'page';

type Props = {
  title: string;
  description?: string;
  /** `page` = Inter 48 semibold hero title (e.g. Events). */
  titleVariant?: TitleVariant;
  /** When set, overrides the default title color (e.g. accent teal). */
  titleColor?: 'default' | 'accent';
  /** Enables pull-to-refresh when set. */
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
};

/** Placeholder screen shell used while features are being built. */
export function Screen({
  title,
  description,
  titleVariant = 'default',
  titleColor = 'default',
  onRefresh,
  refreshing = false,
  children,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const titleStyle = titleVariant === 'page' ? styles.pageTitle : styles.title;
  const color =
    titleColor === 'accent' ? theme.colors.accent : theme.colors.textPrimary;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          titleVariant === 'page' && styles.contentPage,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.textTertiary}
            />
          ) : undefined
        }
      >
        <View style={styles.header}>
          <Text style={[titleStyle, { color }]}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPage,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: theme.spacing[9], // 36 — page content, not navbar
      paddingTop: theme.spacing[4],
      // Room for the floating bottom nav + FAB.
      paddingBottom: theme.sizes.fab + theme.spacing[10],
    },
    contentPage: {
      // Drop hero titles (Events) down 48px from the safe area.
      paddingTop: theme.spacing[12],
    },
    header: {
      gap: theme.spacing[1],
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.textPrimary,
    },
    pageTitle: {
      ...theme.typography.pageTitle,
    },
    description: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
  });
}
