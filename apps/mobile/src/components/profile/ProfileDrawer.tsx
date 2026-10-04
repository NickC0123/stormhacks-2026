import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
};

/** The sheet moves independently of its backdrop and stays mounted until dismissal finishes. */
export function ProfileDrawer({ visible, title, onClose, children, onRefresh, refreshing = false }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const closing = useRef(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }
    closing.current = false;
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: theme.motion.duration.normal,
      easing: Easing.bezier(...theme.motion.easeTab),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, reduceMotion, progress, theme.motion]);

  function close() {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    if (reduceMotion) {
      onClose();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: theme.motion.duration.fast,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) onClose(); });
  }

  return <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
    <KeyboardAvoidingView style={[styles.overlay, { paddingTop: insets.top + theme.spacing[3] }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: progress }]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={`Close ${title}`} />
      <Animated.View style={[styles.sheet, {
        paddingBottom: Math.max(insets.bottom, theme.spacing[3]),
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [theme.spacing[10], 0] }) }],
      }]} accessibilityViewIsModal accessibilityLabel={title}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={close}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}>
            <Ionicons name="close" size={theme.sizes.iconMd} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textTertiary} /> : undefined}>
          {children}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.overlay },
    sheet: { height: '82%', backgroundColor: theme.colors.bgSurface, borderTopLeftRadius: theme.radius.sheet, borderTopRightRadius: theme.radius.sheet, paddingTop: theme.spacing[2], overflow: 'hidden' },
    handle: { alignSelf: 'center', width: theme.spacing[8], height: theme.spacing[1], backgroundColor: theme.colors.borderDefault, borderRadius: theme.radius.full },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[3], paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[1], paddingBottom: theme.spacing[2] },
    title: { ...theme.typography.h4, color: theme.colors.textPrimary, flex: 1 },
    closeButton: { width: theme.sizes.touchTarget, height: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full },
    closePressed: { backgroundColor: theme.colors.bgSurfaceAlt },
    scroll: { flex: 1 },
    content: { paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[2], gap: theme.spacing[6], paddingBottom: theme.spacing[6] },
  });
}
