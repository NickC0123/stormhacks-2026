import { LinearGradient } from 'expo-linear-gradient';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/theme';

type TitleVariant = 'default' | 'page';

type Props = {
  title: string;
  description?: string;
  /** Second line under description (e.g. event body under the date). */
  detail?: string;
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
  /** Fired while the page scrolls (e.g. reveal-on-scroll animations). */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

/** Placeholder screen shell used while features are being built. */
export function Screen({
  title,
  description,
  detail,
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
  onScroll,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const titleStyle = titleVariant === 'page' ? styles.pageTitle : styles.title;
  const color =
    titleColor === 'accent' ? theme.colors.accent : theme.colors.textPrimary;
  const centered = titleAlign === 'center';
  const hasChrome = Boolean(headerLeft || headerRight);
  const hasMeta = Boolean(description || detail);

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
          onScroll={onScroll}
          scrollEventThrottle={onScroll ? 16 : undefined}
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
              {/* Absolutely centered so a lone back button doesn’t shift the title. */}
              <View style={styles.topBarTitleWrap} pointerEvents="none">
                <Text
                  style={[titleStyle, styles.topBarTitle, { color }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              </View>
              <View style={styles.side}>{headerLeft}</View>
              <View style={styles.sideSpacer} />
              <View style={[styles.side, styles.sideRight]}>{headerRight}</View>
            </View>
          ) : (
            <View style={styles.header}>
              <Text style={[titleStyle, { color, textAlign: centered ? 'center' : 'left' }]}>
                {title}
              </Text>
              {description ? <Text style={styles.description}>{description}</Text> : null}
              {detail ? <Text style={styles.description}>{detail}</Text> : null}
            </View>
          )}
          {hasChrome && hasMeta ? (
            <View style={[styles.meta, centered && styles.metaCentered]}>
              {description ? (
                <Text style={[styles.description, centered && styles.descriptionCentered]}>
                  {description}
                </Text>
              ) : null}
              {detail ? (
                <Text style={[styles.description, centered && styles.descriptionCentered]}>
                  {detail}
                </Text>
              ) : null}
            </View>
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
      marginHorizontal: -theme.sizes.pagePaddingX,
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
      zIndex: 1,
    },
    sideRight: {
      alignItems: 'flex-end',
    },
    sideSpacer: {
      flex: 1,
    },
    topBarTitleWrap: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      // Keep clear of the circular header controls.
      paddingHorizontal: theme.sizes.navPaddingX + theme.sizes.fab,
    },
    topBarTitle: {
      textAlign: 'center',
    },
    content: {
      paddingHorizontal: theme.sizes.pagePaddingX,
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
    /** Date / detail under the chrome bar; left-aligned to page padding. */
    meta: {
      gap: theme.spacing[1],
      marginTop: theme.spacing[4], // 16 below header bar
      alignItems: 'flex-start',
    },
    metaCentered: {
      alignItems: 'center',
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
    descriptionCentered: {
      textAlign: 'center',
    },
  });
}
