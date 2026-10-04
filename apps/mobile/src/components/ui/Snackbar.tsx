import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { useTheme, type Theme } from '@/theme';

type SnackbarVariant = 'success';

type SnackbarRequest = {
  message: string;
  variant?: SnackbarVariant;
  /**
   * Show above native stack modals/drawers (Scan Expense, etc.).
   * Uses FullWindowOverlay on iOS so the toast isn’t trapped under the drawer.
   */
  overModal?: boolean;
};

type SnackbarContextValue = {
  showSnackbar: (request: SnackbarRequest) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return ctx;
}

type ProviderProps = {
  children: ReactNode;
};

/** App-wide snackbar host — sits above the floating bottom nav. */
export function SnackbarProvider({ children }: ProviderProps) {
  const [request, setRequest] = useState<SnackbarRequest | null>(null);

  const showSnackbar = useCallback((next: SnackbarRequest) => {
    setRequest(next);
  }, []);

  const dismiss = useCallback(() => {
    setRequest(null);
  }, []);

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <SnackbarHost request={request} onDismiss={dismiss} />
    </SnackbarContext.Provider>
  );
}

type HostProps = {
  request: SnackbarRequest | null;
  onDismiss: () => void;
};

function SnackbarHost({ request, onDismiss }: HostProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState<SnackbarVariant>('success');
  const [overModal, setOverModal] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

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
    if (!request) return;

    const id = ++requestId.current;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    setMessage(request.message);
    setVariant(request.variant ?? 'success');
    setOverModal(Boolean(request.overModal));
    setMounted(true);

    const [x1, y1, x2, y2] = theme.motion.easeTab;
    const easing = Easing.bezier(x1, y1, x2, y2);

    if (reduceMotion) {
      progress.setValue(1);
    } else {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: theme.motion.toast.openDur,
        easing,
        useNativeDriver: true,
      }).start();
    }

    hideTimer.current = setTimeout(() => {
      if (requestId.current !== id) return;

      const finish = () => {
        if (requestId.current !== id) return;
        setMounted(false);
        onDismiss();
      };

      if (reduceMotion) {
        progress.setValue(0);
        finish();
        return;
      }

      Animated.timing(progress, {
        toValue: 0,
        duration: theme.motion.toast.closeDur,
        easing,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) finish();
      });
    }, theme.motion.toast.autoHideMs);

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [request, reduceMotion, theme, progress, onDismiss]);

  if (!mounted) return null;

  // Above bottom nav on tabs; over drawers, sit just above the home indicator / CTAs.
  const bottom = overModal
    ? Math.max(insets.bottom, theme.spacing[3]) + theme.spacing[3]
    : Math.max(insets.bottom, theme.spacing[3]) +
      theme.spacing[3] +
      theme.sizes.fab +
      theme.spacing[2];

  const toast = (
    <SnackbarToast
      message={message}
      variant={variant}
      progress={progress}
      style={[styles.host, { bottom }]}
    />
  );

  if (!overModal) {
    return toast;
  }

  // iOS native stack modals own their own window; FullWindowOverlay draws above them.
  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{toast}</FullWindowOverlay>;
  }

  return (
    <View pointerEvents="box-none" style={styles.androidOverlay}>
      {toast}
    </View>
  );
}

type ToastProps = {
  message: string;
  variant: SnackbarVariant;
  progress: Animated.Value;
  style?: StyleProp<ViewStyle>;
};

/** Presentational success toast — shared by the app host and in-drawer anchors. */
export function SnackbarToast({ message, variant, progress, style }: ToastProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const isSuccess = variant === 'success';

  const opacity = progress;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.motion.toast.distance, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.motion.toast.scale, 1],
  });

  return (
    <View pointerEvents="box-none" style={style}>
      <Animated.View
        accessibilityLiveRegion="polite"
        accessibilityRole="text"
        style={[
          styles.toast,
          isSuccess && styles.toastSuccess,
          {
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        {isSuccess ? (
          <Ionicons
            name="checkmark"
            size={theme.snackbar.iconSize}
            color={theme.colors.success}
          />
        ) : null}
        <Text style={[styles.message, isSuccess && styles.messageSuccess]}>{message}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * Renders a snackbar inside the current screen tree (use inside native modals/drawers).
 */
export function InlineSnackbar({
  message,
  visible,
  onHidden,
  bottomOffset,
}: {
  message: string;
  visible: boolean;
  onHidden: () => void;
  bottomOffset: number;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showId = useRef(0);
  const onHiddenRef = useRef(onHidden);
  onHiddenRef.current = onHidden;

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
    if (!visible) return;

    const id = ++showId.current;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setMounted(true);

    const [x1, y1, x2, y2] = theme.motion.easeTab;
    const easing = Easing.bezier(x1, y1, x2, y2);

    if (reduceMotion) {
      progress.setValue(1);
    } else {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: theme.motion.toast.openDur,
        easing,
        useNativeDriver: true,
      }).start();
    }

    hideTimer.current = setTimeout(() => {
      if (showId.current !== id) return;
      const finish = () => {
        if (showId.current !== id) return;
        setMounted(false);
        onHiddenRef.current();
      };
      if (reduceMotion) {
        progress.setValue(0);
        finish();
        return;
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: theme.motion.toast.closeDur,
        easing,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) finish();
      });
    }, theme.motion.toast.autoHideMs);

    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [visible, message, reduceMotion, theme, progress]);

  if (!mounted) return null;

  return (
    <SnackbarToast
      message={message}
      variant="success"
      progress={progress}
      style={[styles.host, { bottom: bottomOffset }]}
    />
  );
}

function createStyles(theme: Theme) {
  const s = theme.snackbar;

  return StyleSheet.create({
    androidOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 1000,
      elevation: 1000,
    },
    host: {
      position: 'absolute',
      left: theme.sizes.navPaddingX,
      right: theme.sizes.navPaddingX,
      zIndex: 100,
      elevation: 100,
      alignItems: 'stretch',
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.gap,
      paddingHorizontal: s.paddingX,
      paddingVertical: s.paddingY,
      borderRadius: s.radius,
    },
    toastSuccess: {
      backgroundColor: theme.colors.successSubtle,
    },
    message: {
      flexShrink: 1,
      fontFamily: theme.fonts.sans.medium,
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 16 * -0.03,
    },
    messageSuccess: {
      color: theme.colors.success,
    },
  });
}
