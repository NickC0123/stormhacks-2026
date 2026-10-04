import { useLocalSearchParams } from 'expo-router';

import { ExpenseEditor } from '@/components/expenses/ExpenseEditor';

export default function ExpenseScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  return <ExpenseEditor expenseId={expenseId} />;
}
