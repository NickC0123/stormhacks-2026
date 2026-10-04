import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** Matches Events hero title sizing when set. */
  titleVariant?: 'default' | 'page';
  titleColor?: string;
};

/**
 * In-content top bar: same surface as the page/panel (no separate nav chrome),
 * with optional side actions. Title stays centered even with one-sided controls.
 */
export function PageHeader({
  title,
  left,
  right,
  titleVariant = 'default',
  titleColor,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const titleStyle = titleVariant === 'page' ? styles.pageTitle : styles.title;

  return (
    <View style={[styles.topBar, titleVariant === 'page' && styles.topBarPage]}>
      <View style={styles.topBarTitleWrap} pointerEvents="none">
        <Text
          style={[
            titleStyle,
            styles.topBarTitle,
            { color: titleColor ?? theme.colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      <View style={styles.side}>{left}</View>
      <View style={styles.sideSpacer} />
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.sizes.navPaddingX,
      paddingTop: theme.spacing[2],
      paddingBottom: theme.spacing[3],
      minHeight: theme.sizes.fab,
    },
    topBarPage: {
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
      paddingHorizontal: theme.sizes.navPaddingX + theme.sizes.fab,
    },
    topBarTitle: {
      textAlign: 'center',
    },
    title: {
      ...theme.typography.h2,
    },
    pageTitle: {
      ...theme.typography.pageTitle,
    },
  });
}
