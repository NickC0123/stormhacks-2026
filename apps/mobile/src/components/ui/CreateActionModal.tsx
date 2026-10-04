import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Centered create chooser — Figma alert: Add Event / New Expense. */
export function CreateActionModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

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

  function goAddEvent() {
    requestClose();
    router.push('/events/new');
  }

  function goNewExpense() {
    requestClose();
    // Same destination as "Add receipt" on the event screen (temporary test event).
    router.push({ pathname: '/events/[eventId]/receipts/scan', params: { eventId: 'test' } });
  }

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.motion.modal.scale, 1],
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
            styles.card,
            {
              opacity: progress,
              transform: [{ scale }],
            },
          ]}
          accessibilityViewIsModal
          accessibilityLabel="What would you like to add?"
        >
          <Text style={styles.title}>What would you like to add?</Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={goAddEvent}
              accessibilityRole="button"
              accessibilityLabel="Add Event"
            >
              <Text style={styles.actionLabel}>Add Event</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={goNewExpense}
              accessibilityRole="button"
              accessibilityLabel="New Expense"
            >
              <Text style={styles.actionLabel}>New Expense</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(theme: Theme) {
  const m = theme.createActionModal;

  return StyleSheet.create({
    overlayRoot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[6],
    },
    overlayFill: {
      ...StyleSheet.absoluteFill,
      // Figma Miscellaneous/Alert - Overlay ≈ #29293a @ 23%
      backgroundColor: 'rgba(41, 41, 58, 0.23)',
    },
    card: {
      width: m.width,
      maxWidth: '100%',
      borderRadius: theme.radius.sheet,
      // Figma alert BG — light secondary surface, no elevation shadow
      backgroundColor: theme.colors.navBar,
      paddingHorizontal: m.padding,
      paddingTop: m.titlePaddingTop,
      paddingBottom: m.padding,
    },
    title: {
      fontFamily: theme.fonts.sans.semibold,
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: -0.43,
      color: theme.colors.textPrimary,
      textAlign: 'left',
      marginHorizontal: theme.spacing[2], // 8 — title-frame inset
      marginBottom: m.titleToActions,
    },
    actions: {
      gap: m.actionGap,
    },
    action: {
      height: m.actionHeight,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing[4],
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.accent,
    },
    actionPressed: {
      backgroundColor: theme.colors.accentActive,
    },
    actionLabel: {
      fontFamily: theme.fonts.sans.medium,
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.onAccent,
      textAlign: 'center',
    },
  });
}
