import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { getEvent, displayName } from '@/lib/events';
import { formatCents } from '@/lib/expenses';
import { getFriends } from '@/lib/friends';
import { addPerson, removePerson } from '@/lib/people';
import { useProfile } from '@/lib/profile';
import { useTheme, type Theme } from '@/theme';
import type { EventUser } from '@/types';

const messageOf = (err: unknown) => err instanceof Error ? err.message : String(err);

/**
 * People chosen for a new expense before it exists. The server starts every new
 * expense with the payer plus the event's members, so only differences are sent.
 */
export function useSplitDraft(eventId: string | null) {
  const { profile } = useProfile();
  const [eventMembers, setEventMembers] = useState<{ eventId: string; members: EventUser[] } | null>(null);
  const [eventError, setEventError] = useState<{ eventId: string; message: string } | null>(null);
  const [friends, setFriends] = useState<EventUser[]>([]);
  const [friendsError, setFriendsError] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    getFriends()
      .then((overview) => { if (active) setFriends(overview.friends.map(({ user }) => user)); })
      .catch((err) => { if (active) setFriendsError(messageOf(err)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    getEvent(eventId)
      .then((event) => { if (active) setEventMembers({ eventId, members: event.members }); })
      .catch((err) => { if (active) setEventError({ eventId, message: messageOf(err) }); });
    return () => { active = false; };
  }, [eventId]);

  const me: EventUser | null = profile ? { id: profile.id, username: profile.username } : null;
  const members = eventId && eventMembers?.eventId === eventId ? eventMembers.members : [];
  const loadingEvent = Boolean(eventId) && eventMembers?.eventId !== eventId && eventError?.eventId !== eventId;
  const defaults = new Map<string, EventUser>();
  if (me) defaults.set(me.id, me);
  for (const member of members) defaults.set(member.id, member);

  const people = new Map(defaults);
  for (const friend of friends) if (!people.has(friend.id)) people.set(friend.id, friend);
  const selectedIds = [...people.keys()]
    .filter((id) => defaults.has(id) ? !excluded.has(id) : added.has(id));

  function toggle(id: string) {
    const update = (set: Set<string>) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    };
    if (defaults.has(id)) setExcluded(update); else setAdded(update);
  }

  /** Adds before removing so the expense never drops to zero people. Returns failures. */
  async function apply(expenseId: string): Promise<string[]> {
    const selected = new Set(selectedIds);
    const failures: string[] = [];
    for (const id of selected) {
      if (defaults.has(id)) continue;
      try { await addPerson('expense', expenseId, { user_id: id }); } catch (err) {
        failures.push(`${displayName(people.get(id)!)}: ${messageOf(err)}`);
      }
    }
    for (const id of defaults.keys()) {
      if (selected.has(id)) continue;
      try { await removePerson('expense', expenseId, id); } catch (err) {
        failures.push(`${displayName(defaults.get(id)!)}: ${messageOf(err)}`);
      }
    }
    return failures;
  }

  return {
    me,
    people: [...people.values()],
    selectedIds,
    eventMemberIds: new Set(members.map((member) => member.id)),
    loading: loadingEvent,
    error: [eventId && eventError?.eventId === eventId ? `Could not load event members: ${eventError.message}` : '',
      friendsError ? `Could not load friends: ${friendsError}` : ''].filter(Boolean).join(' '),
    toggle,
    apply,
  };
}

export type SplitDraft = ReturnType<typeof useSplitDraft>;

/** Matches the API's equal split: whole cents, remainder to the lowest ids. */
function equalShares(totalCents: number, ids: string[]) {
  const sorted = [...ids].sort();
  const base = Math.floor(totalCents / sorted.length);
  const remainder = totalCents - base * sorted.length;
  return new Map(sorted.map((id, i) => [id, base + (i < remainder ? 1 : 0)]));
}

type Props = {
  draft: SplitDraft;
  totalCents: number;
  currency: string;
  disabled?: boolean;
};

export function SplitPicker({ draft, totalCents, currency, disabled }: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const selected = new Set(draft.selectedIds);
  const shares = selected.size ? equalShares(totalCents, draft.selectedIds) : new Map<string, number>();

  return (
    <View style={styles.content}>
      <Text style={styles.hint}>
        {draft.eventMemberIds.size
          ? 'Everyone in the event splits this equally. Remove anyone who isn’t sharing it, or add friends.'
          : 'Choose who shares this expense equally. You can invite people by username after saving.'}
      </Text>
      {draft.loading ? <Text style={styles.hint}>Loading event members…</Text> : null}
      {draft.error ? <Text style={styles.hint} accessibilityRole="alert">{draft.error}</Text> : null}
      <ListGroup title="Split between" count={selected.size}>
        {draft.people.map((person) => {
          const included = selected.has(person.id);
          const me = person.id === draft.me?.id;
          const role = me ? 'You' : draft.eventMemberIds.has(person.id) ? 'Event member' : 'Friend';
          const subtitle = included
            ? `${role} · ${currency} ${formatCents(shares.get(person.id) ?? 0)}`
            : `${role} · Not splitting`;
          const lastOne = included && selected.size <= 1;
          return (
            <FriendRow
              key={person.id}
              username={person.username ?? 'unknown'}
              subtitle={subtitle}
              actions={(
                <Button
                  label={included ? (me ? 'Exclude me' : 'Remove') : (me ? 'Include me' : 'Add')}
                  size="sm"
                  variant={included ? 'ghost' : 'secondary'}
                  disabled={disabled || lastOne}
                  accessibilityLabel={`${included ? 'Remove' : 'Add'} ${me ? 'yourself' : displayName(person)}`}
                  onPress={() => draft.toggle(person.id)}
                />
              )}
            />
          );
        })}
      </ListGroup>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    content: { gap: theme.spacing[3] },
    hint: { ...theme.typography.bodySm, color: theme.colors.textSecondary },
  });
}
