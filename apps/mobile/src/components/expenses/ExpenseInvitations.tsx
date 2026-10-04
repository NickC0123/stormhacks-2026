import { router } from 'expo-router';

import { FriendRow } from '@/components/friends/FriendRow';
import { Button } from '@/components/ui/Button';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadState } from '@/components/ui/LoadState';
import { useFocusedData } from '@/hooks/useFocusedData';
import { acceptExpenseInvite, cancelPeopleInvite, listExpenseInvites } from '@/lib/people';

export function ExpenseInvitations() {
  const { data, loading, error, retry, busyIds, run } = useFocusedData(listExpenseInvites, 'Could not load invitations.');
  if (loading || error) return <LoadState loading={loading} error={error} fallbackError="Could not load invitations." onRetry={retry} />;
  if (!data?.length) return null;
  return <ListGroup title="Expense invitations" count={data.length}>
    {data.map((invite) => <FriendRow key={invite.id} username={invite.invited_by.username ?? 'unknown'}
      avatarColor={invite.invited_by.avatar_color}
      subtitle={`Invited you to ${invite.expense.title}`} actions={<>
        <Button label="Join" size="sm" loading={busyIds.has(invite.id)} accessibilityLabel={`Join ${invite.expense.title}`}
          onPress={() => run(invite.id, async () => {
            const expense = await acceptExpenseInvite(invite.id);
            router.push({ pathname: '/expenses/[expenseId]', params: { expenseId: expense.id } });
          }, 'Could not join expense')} />
        <Button label="Decline" size="sm" variant="secondary" disabled={busyIds.has(invite.id)}
          accessibilityLabel={`Decline invitation to ${invite.expense.title}`}
          onPress={() => run(invite.id, () => cancelPeopleInvite('expense', invite.id), 'Could not decline invitation')} />
      </>} />)}
  </ListGroup>;
}
