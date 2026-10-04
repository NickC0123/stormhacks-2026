import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SFSymbolIcon } from '@/components/ui/SFSymbolIcon';
import { useTheme, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Optional subtitle under the title (e.g. amount or username). */
  subtitle?: string;
  /** Extra caption lines under the subtitle (e.g. event name, event date). */
  details?: string[];
  accessibilityLabel?: string;
  /** Sticky actions below the scrollable body (e.g. settle buttons). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Half-page bottom sheet. Slides up with the same panel-reveal motion as
 * create/action modals. Body scrolls when content needs more than ~half screen.
 */
export function BottomDrawer({
  visible,
  onClose,
  title,
  subtitle,
  details,
  accessibilityLabel,
  footer,
  children,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const minHeight = Math.round(windowHeight * theme.sizes.drawerMaxHeightRatio);
  const maxHeight = Math.round(windowHeight * theme.sizes.drawerMaxHeightRatioExpanded);
  const styles = createStyles(theme, insets.bottom, minHeight, maxHeight);

  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const wasOpen = useRef(false);
  const closingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const [x1, y1, x2, y2] = theme.motion.easeTab;
    const easing = Easing.bezier(x1, y1, x2, y2);

    if (visible) {
      wasOpen.current = true;
      closingRef.current = false;
      setMounted(true);

      if (reduceMotion) {
        progress.setValue(1);
        return;
      }

      progress.setValue(0);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: theme.motion.modal.openDur,
        easing,
        useNativeDriver: true,
      });
      anim.start();
      return () => anim.stop();
    }

    if (!wasOpen.current) return;

    if (reduceMotion) {
      progress.setValue(0);
      wasOpen.current = false;
      closingRef.current = false;
      setMounted(false);
      return;
    }

    closingRef.current = true;
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: theme.motion.modal.closeDur,
      easing,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      wasOpen.current = false;
      closingRef.current = false;
      setMounted(false);
    });
    return () => anim.stop();
  }, [visible, reduceMotion, theme, progress]);

  function requestClose() {
    if (closingRef.current || !wasOpen.current) return;
    onClose();
  }

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [minHeight, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <View style={styles.overlayRoot}>
        <Animated.View style={[styles.overlayFill, { opacity: progress }]} pointerEvents="none" />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: progress,
              transform: [{ translateY }],
            },
          ]}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel ?? title}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {details?.map((line) => (
                <Text key={line} style={styles.detail}>
                  {line}
                </Text>
              ))}
            </View>
            <Pressable
              onPress={requestClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={theme.spacing[2]}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
            >
              <SFSymbolIcon name="xmark" color={theme.colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(theme: Theme, bottomInset: number, minHeight: number, maxHeight: number) {
  return StyleSheet.create({
    overlayRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlayFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      minHeight,
      maxHeight,
      backgroundColor: theme.colors.bgSurface,
      borderTopLeftRadius: theme.radius.sheet,
      borderTopRightRadius: theme.radius.sheet,
      paddingHorizontal: theme.sizes.pagePaddingX,
      paddingTop: theme.spacing[3],
      paddingBottom: Math.max(bottomInset, theme.spacing[6]),
      gap: theme.spacing[4],
      ...theme.shadows.lg,
    },
    handle: {
      alignSelf: 'center',
      width: theme.spacing[10],
      height: theme.spacing[1],
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.borderDefault,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing[3],
    },
    header: {
      flex: 1,
      gap: theme.spacing[0.5],
    },
    title: {
      ...theme.typography.h4,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    detail: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      width: theme.sizes.touchTarget,
      height: theme.sizes.touchTarget,
      marginTop: -theme.spacing[2],
      marginRight: -theme.spacing[2],
      alignItems: 'center',
      justifyContent: 'center',
    },
    closePressed: {
      opacity: theme.opacity.disabled,
    },
    scroll: {
      flexGrow: 1,
      flexShrink: 1,
    },
    scrollContent: {
      gap: theme.spacing[2],
      paddingBottom: theme.spacing[2],
      flexGrow: 1,
    },
    footer: {
      gap: theme.spacing[2],
    },
  });
}
