import { useLocalSearchParams } from 'expo-router';

import { ExpenseEditor } from '@/components/expenses/ExpenseEditor';

export default function NewExpenseScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  return <ExpenseEditor initialEventId={eventId} />;
}
