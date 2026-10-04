import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateActionModal } from '@/components/ui/CreateActionModal';
import { useTheme, type Theme } from '@/theme';

type TabKey = 'index' | 'expenses' | 'profile';

type TabRoute = {
  key: string;
  name: string;
  params?: object;
};

type BottomNavProps = {
  state: {
    index: number;
    routes: readonly TabRoute[];
  };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

type TabItem = {
  key: TabKey;
  label: string;
  /** SF Symbol / custom asset; tinted with the tab color. */
  source: ImageSourcePropType;
};

type TabLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const TABS: TabItem[] = [
  {
    key: 'index',
    label: 'Events',
    // SF Symbol: list.bullet.below.rectangle
    source: require('../../../assets/icons/list-bullet-below-rectangle.png'),
  },
  {
    key: 'expenses',
    label: 'Expenses',
    // SF Symbol: chart.xyaxis.line
    source: require('../../../assets/icons/chart-xyaxis-line.png'),
  },
  {
    key: 'profile',
    label: 'Profile',
    // SF Symbol: person.crop.circle
    source: require('../../../assets/icons/person-crop-circle.png'),
  },
];

/** Floating pill tab bar + create FAB from the Figma bottom nav. */
export function BottomNav({ state, navigation }: BottomNavProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const iconSize = theme.typography.label.fontSize;

  const activeRoute = state.routes[state.index]?.name as TabKey | undefined;

  const layouts = useRef<Partial<Record<TabKey, TabLayout>>>({});
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const hasPositioned = useRef(false);

  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const pillY = useRef(new Animated.Value(0)).current;
  const pillH = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!activeRoute) return;
    const layout = layouts.current[activeRoute];
    if (!layout) return;

    const [x1, y1, x2, y2] = theme.motion.easeTab;
    const easing = Easing.bezier(x1, y1, x2, y2);
    const duration = theme.motion.duration.normal;
    const snap = !hasPositioned.current || reduceMotion;

    if (snap) {
      pillX.setValue(layout.x);
      pillW.setValue(layout.width);
      pillY.setValue(layout.y);
      pillH.setValue(layout.height);
      pillOpacity.setValue(1);
      hasPositioned.current = true;
      return;
    }

    Animated.parallel([
      Animated.timing(pillX, { toValue: layout.x, duration, easing, useNativeDriver: false }),
      Animated.timing(pillW, { toValue: layout.width, duration, easing, useNativeDriver: false }),
      Animated.timing(pillY, { toValue: layout.y, duration, easing, useNativeDriver: false }),
      Animated.timing(pillH, { toValue: layout.height, duration, easing, useNativeDriver: false }),
    ]).start();
  }, [activeRoute, layoutVersion, reduceMotion, theme, pillX, pillW, pillY, pillH, pillOpacity]);

  function onTabLayout(key: TabKey, event: LayoutChangeEvent) {
    const { x, y, width, height } = event.nativeEvent.layout;
    const prev = layouts.current[key];
    if (
      prev &&
      prev.x === x &&
      prev.y === y &&
      prev.width === width &&
      prev.height === height
    ) {
      return;
    }
    layouts.current[key] = { x, y, width, height };
    setLayoutVersion((value) => value + 1);
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, theme.spacing[3]) }]}
    >
      <View style={styles.row}>
        <View style={styles.bar} accessibilityRole="tablist">
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingPill,
              {
                opacity: pillOpacity,
                top: pillY,
                height: pillH,
                width: pillW,
                transform: [{ translateX: pillX }],
                backgroundColor: theme.colors.navItemActiveBg,
              },
            ]}
          />

          {TABS.map((tab) => {
            const route = state.routes.find((item: TabRoute) => item.name === tab.key);
            if (!route) return null;

            const focused = activeRoute === tab.key;
            const color = focused ? theme.colors.navItemActive : theme.colors.navItemInactive;

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
                onLayout={(event) => onTabLayout(tab.key, event)}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
                style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
              >
                <Image
                  source={tab.source}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    tintColor: color,
                  }}
                  resizeMode="contain"
                />
                <Text style={[styles.label, { color }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add"
          onPress={() => setCreateOpen(true)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Ionicons name="add" size={theme.sizes.iconLg} color={theme.colors.onAccent} />
        </Pressable>
      </View>

      <CreateActionModal visible={createOpen} onClose={() => setCreateOpen(false)} />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: theme.spacing[3],
      paddingHorizontal: theme.sizes.navPaddingX, // 14
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing[2],
    },
    bar: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: theme.spacing[1],
      paddingHorizontal: theme.spacing[1],
      paddingVertical: theme.spacing[1],
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.navBar,
      ...theme.shadows.nav,
    },
    slidingPill: {
      position: 'absolute',
      left: 0,
      borderRadius: theme.radius.full,
      zIndex: 0,
    },
    tab: {
      position: 'relative',
      zIndex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[1], // 4
      minHeight: theme.sizes.touchTarget,
      paddingHorizontal: theme.spacing[4], // 16
      paddingVertical: theme.spacing[3], // 12
      borderRadius: theme.radius.full,
      backgroundColor: 'transparent',
    },
    pressed: {
      opacity: 0.85,
    },
    label: {
      ...theme.typography.label,
    },
    fab: {
      width: theme.sizes.fab,
      height: theme.sizes.fab,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      ...theme.shadows.fab,
    },
    fabPressed: {
      backgroundColor: theme.colors.accentActive,
    },
  });
}
