import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { ExpenseEditor } from '@/components/expenses/ExpenseEditor';
import { SharedExpense } from '@/components/expenses/SharedExpense';
import { BackButton } from '@/components/ui/BackButton';
import { LoadState } from '@/components/ui/LoadState';
import { Screen } from '@/components/ui/Screen';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getExpense } from '@/lib/expenses';
import { useProfile } from '@/lib/profile';

export default function ExpenseScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const { profile } = useProfile();
  const loader = useCallback(() => getExpense(expenseId), [expenseId]);
  const { data, loading, error, retry } = useFocusedData(loader, 'Could not load expense.');
  if (!data || !profile) {
    return (
      <Screen title="Expense" headerLeft={<BackButton />} headerRight={<View />}>
        <LoadState
          loading={loading || !profile}
          error={error}
          fallbackError="Could not load expense."
          onRetry={retry}
        />
      </Screen>
    );
  }
  return data.created_by === profile.id
    ? <ExpenseEditor expenseId={expenseId} />
    : <SharedExpense expense={data} />;
}
