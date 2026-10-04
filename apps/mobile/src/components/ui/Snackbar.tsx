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
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/theme';

type SnackbarVariant = 'success';

type SnackbarRequest = {
  message: string;
  variant?: SnackbarVariant;
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

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <SnackbarHost
        request={request}
        onDismiss={() => setRequest(null)}
      />
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

  const opacity = progress;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.motion.toast.distance, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.motion.toast.scale, 1],
  });

  // Match BottomNav stack: safe inset + top pad + bar/FAB height + gap above nav.
  const bottom =
    Math.max(insets.bottom, theme.spacing[3]) +
    theme.spacing[3] +
    theme.sizes.fab +
    theme.spacing[2];

  const isSuccess = variant === 'success';

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
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

function createStyles(theme: Theme) {
  const s = theme.snackbar;

  return StyleSheet.create({
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
