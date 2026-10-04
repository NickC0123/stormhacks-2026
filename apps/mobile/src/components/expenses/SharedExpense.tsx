import { useCallback } from 'react';
import { Image, Text, View } from 'react-native';

import { PeopleManager } from '@/components/people/PeopleManager';
import { LoadState } from '@/components/ui/LoadState';
import { Screen } from '@/components/ui/Screen';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getExpenseReceiptUrl } from '@/lib/expenses';
import { useTheme } from '@/theme';
import type { Expense } from '@/types';

export function SharedExpense({ expense }: { expense: Expense }) {
  const theme = useTheme();
  const loader = useCallback(() => expense.receipt_image_path
    ? getExpenseReceiptUrl(expense.id) : Promise.resolve(null), [expense.id, expense.receipt_image_path]);
  const receipt = useFocusedData(loader, 'Could not load receipt image.');
  return <Screen title={expense.title} description={expense.description ?? undefined} withHeader>
    <View style={{ gap: 16, marginTop: 24 }}>
      <Text style={{ ...theme.typography.h2, color: theme.colors.textPrimary }}>{expense.currency} {expense.amount}</Text>
      <Text style={{ color: theme.colors.textSecondary }}>{expense.date}{expense.time ? ` · ${expense.time.slice(0, 5)}` : ''}</Text>
      <Text style={{ color: theme.colors.textSecondary }}>Shared with you. The creator manages expense details.</Text>
      {expense.receipt_image_path ? <>
        <LoadState loading={receipt.loading} error={receipt.error} fallbackError="Could not load receipt image." onRetry={receipt.retry} />
        {receipt.data ? <Image source={{ uri: receipt.data.url }} style={{ height: 220, width: '100%' }} resizeMode="contain" /> : null}
      </> : null}
      {expense.items.map((item, index) => <Text key={item.id ?? index} style={{ color: theme.colors.textPrimary }}>
        {item.name} · {expense.currency} {item.amount}
      </Text>)}
      <PeopleManager kind="expense" id={expense.id} />
    </View>
  </Screen>;
}
