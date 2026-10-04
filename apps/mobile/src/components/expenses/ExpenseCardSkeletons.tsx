import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme, type Theme } from '@/theme';

/** Donut + legend placeholder inside the spending card. */
export function SpendingCardSkeleton() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const line = theme.typography.body.lineHeight ?? theme.spacing[5];
  const caption = theme.typography.caption.lineHeight ?? theme.spacing[4];

  return (
    <SkeletonGroup accessibilityLabel="Loading spending by category" style={styles.spending}>
      <View style={styles.donutWrap}>
        <Skeleton
          width={theme.sizes.donut}
          height={theme.sizes.donut}
          radius="full"
        />
      </View>
      <View style={styles.legend}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={styles.legendRow}>
            <Skeleton width={theme.sizes.swatch} height={theme.sizes.swatch} radius="full" />
            <Skeleton width="40%" height={line} radius="sm" style={styles.flex} />
            <Skeleton width={theme.spacing[12]} height={line} radius="sm" />
            <Skeleton width={theme.spacing[8]} height={caption} radius="sm" />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** You Owe / Owes You header + horizontal balance cards. */
export function BalanceSectionSkeleton() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const title = theme.typography.sectionTitle.lineHeight ?? theme.spacing[5];
  const amount = theme.typography.h4.lineHeight ?? theme.spacing[8];
  const body = theme.typography.body.lineHeight ?? theme.spacing[5];
  const meta = theme.typography.bodySm.lineHeight ?? theme.spacing[4];

  return (
    <SkeletonGroup accessibilityLabel="Loading balances" style={styles.balanceSection}>
      {[0, 1].map((section) => (
        <View key={section} style={styles.balanceGroup}>
          <View style={styles.sectionHeader}>
            <Skeleton width="30%" height={title} radius="sm" />
            <Skeleton width={theme.spacing[12]} height={title} radius="sm" />
          </View>
          <View style={styles.carousel}>
            {Array.from({ length: 2 }, (_, index) => (
              <View key={index} style={styles.balanceCard}>
                <Skeleton width="50%" height={amount} radius="sm" />
                <Skeleton width="60%" height={body} radius="sm" />
                <Skeleton width="45%" height={meta} radius="sm" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

/** Invitation row placeholders. */
export function InvitationListSkeleton() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const title = theme.typography.sectionTitle.lineHeight ?? theme.spacing[5];
  const body = theme.typography.body.lineHeight ?? theme.spacing[5];
  const meta = theme.typography.bodySm.lineHeight ?? theme.spacing[4];

  return (
    <SkeletonGroup accessibilityLabel="Loading invitations" style={styles.invites}>
      <Skeleton width="45%" height={title} radius="sm" />
      {Array.from({ length: 2 }, (_, index) => (
        <View key={index} style={styles.inviteRow}>
          <Skeleton width={theme.sizes.avatarStackSm} height={theme.sizes.avatarStackSm} radius="full" />
          <View style={styles.inviteText}>
            <Skeleton width="50%" height={body} radius="sm" />
            <Skeleton width="75%" height={meta} radius="sm" />
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    spending: {
      gap: theme.spacing[3],
    },
    donutWrap: {
      alignItems: 'center',
      marginTop: theme.spacing[2],
    },
    legend: {
      gap: theme.spacing[2],
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
    },
    flex: {
      flex: 1,
    },
    balanceSection: {
      gap: theme.spacing[6],
    },
    balanceGroup: {
      gap: theme.spacing[3],
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing[3],
    },
    carousel: {
      flexDirection: 'row',
      gap: theme.spacing[3],
    },
    balanceCard: {
      width: theme.sizes.balanceCard,
      padding: theme.spacing[4],
      gap: theme.spacing[3],
      borderRadius: theme.radius.xl,
      borderWidth: theme.sizes.borderWidth,
      borderColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.bgSurface,
    },
    invites: {
      gap: theme.spacing[3],
    },
    inviteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      paddingVertical: theme.spacing[2],
    },
    inviteText: {
      flex: 1,
      gap: theme.spacing[1],
    },
  });
}
