import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { displayName } from '@/lib/events';
import { useTheme, type Theme } from '@/theme';
import type { EventDetail } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  event: EventDetail;
  profileId?: string;
  busyIds: Set<string>;
  onCancelInvite: (inviteId: string) => void;
};

/** Bottom sheet listing event members and pending invites. */
export function EventMembersModal({
  visible,
  onClose,
  event,
  profileId,
  busyIds,
  onCancelInvite,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets.bottom);

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
          accessibilityLabel="Members"
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Members</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ListGroup title="Members" count={event.members.length}>
              {event.members.map((member) => {
                const roles = [
                  member.id === event.created_by ? 'Host' : null,
                  member.id === profileId ? 'You' : null,
                ].filter(Boolean);
                return (
                  <FriendRow
                    key={member.id}
                    username={member.username ?? 'unknown'}
                    avatarColor={member.avatar_color}
                    subtitle={roles.length ? roles.join(' · ') : undefined}
                    onPress={
                      member.id === profileId
                        ? undefined
                        : () => {
                            requestClose();
                            router.push({
                              pathname: '/users/[userId]',
                              params: { userId: member.id },
                            });
                          }
                    }
                  />
                );
              })}
            </ListGroup>

            {event.invites.length > 0 ? (
              <ListGroup title="Invited" count={event.invites.length}>
                {event.invites.map((invite) => (
                  <FriendRow
                    key={invite.id}
                    username={invite.user.username ?? 'unknown'}
                    avatarColor={invite.user.avatar_color}
                    subtitle={`Invited by ${
                      invite.invited_by.id === profileId ? 'you' : displayName(invite.invited_by)
                    }`}
                    actions={
                      <Button
                        label="Cancel"
                        size="sm"
                        variant="ghost"
                        loading={busyIds.has(invite.id)}
                        onPress={() => onCancelInvite(invite.id)}
                        accessibilityLabel={`Cancel invite for ${displayName(invite.user)}`}
                      />
                    }
                  />
                ))}
              </ListGroup>
            ) : null}
          </ScrollView>

          <Button label="Done" variant="secondary" onPress={requestClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(theme: Theme, bottomInset: number) {
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
      maxHeight: '80%',
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
    title: {
      ...theme.typography.h4,
      color: theme.colors.textPrimary,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      gap: theme.spacing[6],
      paddingBottom: theme.spacing[2],
    },
  });
}
