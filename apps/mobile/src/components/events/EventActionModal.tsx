import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  InteractionManager,
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
  onAddPhoto: () => void;
  onAddExpense: () => void;
};

/**
 * Event create chooser — Add Photos / Add Expense.
 * Same panel reveal motion as CreateActionModal.
 */
export function EventActionModal({ visible, onClose, onAddPhoto, onAddExpense }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const wasOpen = useRef(false);
  const closingRef = useRef(false);
  /** Run after the RN Modal fully unmounts — launching the photo picker while it is still up cancels the picker on iOS. */
  const afterClose = useRef<(() => void) | null>(null);

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

  function finishClose() {
    wasOpen.current = false;
    closingRef.current = false;
    setMounted(false);
    const next = afterClose.current;
    afterClose.current = null;
    if (next) {
      // Wait until the native Modal is gone — opening PHPicker on top of it cancels selection on iOS.
      InteractionManager.runAfterInteractions(() => {
        next();
      });
    }
  }

  useEffect(() => {
    const [x1, y1, x2, y2] = theme.motion.easeTab;
    const easing = Easing.bezier(x1, y1, x2, y2);

    if (visible) {
      wasOpen.current = true;
      closingRef.current = false;
      afterClose.current = null;
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
      finishClose();
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
      finishClose();
    });
    return () => anim.stop();
  }, [visible, reduceMotion, theme, progress]);

  function requestClose(then?: () => void) {
    if (closingRef.current || !wasOpen.current) return;
    afterClose.current = then ?? null;
    onClose();
  }

  function choosePhoto() {
    requestClose(onAddPhoto);
  }

  function chooseExpense() {
    requestClose(onAddExpense);
  }

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      theme.motion.modal.panelHeight * theme.motion.modal.translateYRatio,
      0,
    ],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={() => requestClose()}
      statusBarTranslucent
    >
      <View style={styles.overlayRoot}>
        <Animated.View style={[styles.overlayFill, { opacity: progress }]} pointerEvents="none" />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => requestClose()}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: progress,
              transform: [{ translateY }],
            },
          ]}
          accessibilityViewIsModal
          accessibilityLabel="What would you like to add?"
        >
          <Text style={styles.title}>What would you like to add?</Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={choosePhoto}
              accessibilityRole="button"
              accessibilityLabel="Add Photos"
            >
              <Text style={styles.actionLabel}>Add Photos</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={chooseExpense}
              accessibilityRole="button"
              accessibilityLabel="Add Expense"
            >
              <Text style={styles.actionLabel}>Add Expense</Text>
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
      backgroundColor: theme.colors.overlay,
    },
    card: {
      width: m.width,
      maxWidth: '100%',
      borderRadius: theme.radius.sheet,
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
      marginHorizontal: theme.spacing[2],
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
