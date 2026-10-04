import { LinearGradient } from 'expo-linear-gradient';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/theme';

type TitleVariant = 'default' | 'page';

type Props = {
  title: string;
  description?: string;
  /** `page` = Inter 32 semibold hero title (e.g. Events). */
  titleVariant?: TitleVariant;
  /** When set, overrides the default title color (e.g. accent teal). */
  titleColor?: 'default' | 'accent';
  titleAlign?: 'left' | 'center';
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  /** Enables pull-to-refresh when set. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Set when a navigation header is shown above the screen; it already covers the top inset. */
  withHeader?: boolean;
  children?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Soft scrim over the bottom of scrolling content (Events). */
  bottomFade?: boolean;
};

/** Placeholder screen shell used while features are being built. */
export function Screen({
  title,
  description,
  titleVariant = 'default',
  titleColor = 'default',
  titleAlign = 'left',
  headerLeft,
  headerRight,
  onRefresh,
  refreshing = false,
  withHeader = false,
  children,
  contentStyle,
  bottomFade = false,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const titleStyle = titleVariant === 'page' ? styles.pageTitle : styles.title;
  const color =
    titleColor === 'accent' ? theme.colors.accent : theme.colors.textPrimary;
  const centered = titleAlign === 'center';
  const hasChrome = Boolean(headerLeft || headerRight);

  return (
    <SafeAreaView
      style={styles.container}
      edges={withHeader ? ['left', 'right'] : ['top', 'left', 'right']}
    >
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            titleVariant === 'page' && !hasChrome && styles.contentPage,
            hasChrome && styles.contentWithChrome,
            contentStyle,
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
          {hasChrome ? (
            <View
              style={[
                styles.topBar,
                titleVariant === 'page' && styles.topBarPage,
              ]}
            >
              <View style={styles.side}>{headerLeft}</View>
              <Text
                style={[
                  titleStyle,
                  styles.topBarTitle,
                  { color, textAlign: 'center' },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <View style={[styles.side, styles.sideRight]}>{headerRight}</View>
            </View>
          ) : (
            <View style={styles.header}>
              <Text style={[titleStyle, { color, textAlign: centered ? 'center' : 'left' }]}>
                {title}
              </Text>
              {description ? <Text style={styles.description}>{description}</Text> : null}
            </View>
          )}
          {hasChrome && description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
          {children}
        </ScrollView>

        {bottomFade ? (
          <LinearGradient
            pointerEvents="none"
            colors={[
              withAlpha(theme.colors.bgPage, 0),
              withAlpha(theme.colors.bgPage, theme.opacity.bottomFade * 0.45),
              withAlpha(theme.colors.bgPage, theme.opacity.bottomFade),
            ]}
            locations={[0.35, 0.72, 1]}
            style={styles.bottomFade}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/** Convert #RRGGBB to rgba() for gradient stops. */
function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPage,
    },
    body: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    bottomFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: theme.sizes.bottomFade,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      // Bleed to screen edges, then apply nav inset (content is wider-padded).
      marginHorizontal: -theme.spacing[9],
      paddingHorizontal: theme.sizes.navPaddingX,
      paddingTop: theme.spacing[2],
      paddingBottom: theme.spacing[3],
      minHeight: theme.sizes.fab,
    },
    topBarPage: {
      // Align with Figma Events header under the status bar.
      paddingTop: theme.spacing[3],
    },
    side: {
      width: theme.sizes.fab,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    sideRight: {
      alignItems: 'flex-end',
    },
    topBarTitle: {
      flex: 1,
    },
    content: {
      paddingHorizontal: theme.spacing[9], // 36 — page content, not navbar
      paddingTop: theme.spacing[4],
      // Room for the floating bottom nav + circle button.
      paddingBottom: theme.sizes.fab + theme.spacing[10],
    },
    contentWithChrome: {
      // Top bar owns the top inset when chrome scrolls with content.
      paddingTop: 0,
    },
    contentPage: {
      // Drop hero titles down when there is no top chrome row.
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
