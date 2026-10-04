import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { Expense, ExpenseWrite, ParsedReceipt } from '@/types';

import { apiFetch } from './api';

export type ExpenseEvent = { id: string; title: string };
export const listExpenseEvents = () => apiFetch<ExpenseEvent[]>('/events');
export const listExpenses = (offset = 0) => apiFetch<Expense[]>(`/expenses?offset=${offset}`);
export const getExpense = (id: string) => apiFetch<Expense>(`/expenses/${id}`);
export const saveExpense = (body: ExpenseWrite, id?: string) => apiFetch<Expense>(
  id ? `/expenses/${id}` : '/expenses',
  { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) },
);

export function attachExpenseReceipt(id: string, asset: ImagePickerAsset) {
  const form = new FormData();
  form.append('file', new File(asset.uri) as unknown as Blob);
  return apiFetch<Expense>(`/expenses/${id}/receipt`, { method: 'POST', body: form });
}

export const getExpenseReceiptUrl = (id: string) => apiFetch<{ url: string }>(`/expenses/${id}/receipt`);

export function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** The printed receipt total stays authoritative even when the parser flags a mismatch. */
export function receiptExpenseFields(receipt: ParsedReceipt) {
  return {
    title: receipt.merchant ?? '',
    date: receipt.date ?? '',
    time: null,
    currency: receipt.currency,
    amount: receipt.total ?? '',
    items: receipt.items.map((item) => ({
      name: item.normalized_name || item.description,
      category: item.category,
      amount: item.line_total,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    parsed_receipt: receipt,
  };
}
