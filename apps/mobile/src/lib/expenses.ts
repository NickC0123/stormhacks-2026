import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import type { BalanceDashboard, Expense, ExpenseWrite, ItemCategory, ParsedReceipt, SpendingSummary } from '@/types';

import { apiFetch } from './api';

/** Display names in picker order. */
export const categoryLabels: Record<ItemCategory, string> = {
  groceries: 'Groceries',
  food_drinks: 'Food & Drinks',
  transportation: 'Transportation',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  housing: 'Housing',
  bills_utilities: 'Bills & Utilities',
  subscriptions: 'Subscriptions',
  health_fitness: 'Health & Fitness',
  education: 'Education',
  personal_care: 'Personal Care',
  work: 'Work',
  other: 'Other',
};

export const isItemCategory = (value: string): value is ItemCategory => value in categoryLabels;

export const listSpending = () => apiFetch<SpendingSummary>('/dashboard/spending');

/** Note for amounts that could not be converted to CAD, or null when everything was. */
export function unconvertedNote(currencies: string[]) {
  return currencies.length
    ? `Expenses in ${currencies.join(', ')} are not included because there is no CAD exchange rate for them.`
    : null;
}

/** Records that the whole balance with `userId` was paid; `amount` is the balance shown. */
export const settleUp = (userId: string, amount: string) => apiFetch<BalanceDashboard>('/settlements', {
  method: 'POST',
  body: JSON.stringify({ user_id: userId, amount }),
});

export type ExpenseEvent = { id: string; title: string };
export const listExpenseEvents = () => apiFetch<ExpenseEvent[]>('/events');
export const listExpenses = (offset = 0) => apiFetch<Expense[]>(`/expenses?offset=${offset}`);
export const getExpense = (id: string) => apiFetch<Expense>(`/expenses/${id}`);
export const saveExpense = (body: ExpenseWrite, id?: string) => apiFetch<Expense>(
  id ? `/expenses/${id}` : '/expenses',
  { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) },
);

/** Creator only. Removes the expense for everyone on it. */
export const deleteExpense = (id: string) => apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' });

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

const centsPattern = /^(-?)(\d{1,10})(?:\.(\d{1,2}))?$/;

/** Exact cents for a money string, or null if it is not a valid amount. */
export function toCents(value: string | null | undefined): number | null {
  const match = centsPattern.exec(value?.trim() ?? '');
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? '').padEnd(2, '0'));
  return match[1] ? -cents : cents;
}

export function formatCents(cents: number) {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export type ExpenseTotal = { subtotal: number; discount: number; tax: number; tip: number; total: number };

/**
 * The overall amount is always items - receipt discount + tax + tip, in cents.
 * Discount, tax and tip come from the scanned receipt when one was used.
 * Returns null while any item amount is invalid.
 */
export function expenseTotal({ items, parsed_receipt }: Pick<ExpenseWrite, 'items' | 'parsed_receipt'>): ExpenseTotal | null {
  let subtotal = 0;
  for (const item of items) {
    const cents = toCents(item.amount);
    if (cents === null) return null;
    subtotal += cents;
  }
  const discount = toCents(parsed_receipt?.discount) ?? 0;
  const tax = toCents(parsed_receipt?.tax) ?? 0;
  const tip = toCents(parsed_receipt?.tip) ?? 0;
  return { subtotal, discount, tax, tip, total: subtotal - discount + tax + tip };
}

/** Matches the API's rounding tolerance when checking a receipt's totals. */
const TOTAL_TOLERANCE_CENTS = 2;

/** The printed receipt total in cents when it differs from the calculated total, otherwise null. */
export function receiptTotalMismatch(total: ExpenseTotal | null, receipt: ParsedReceipt | null): number | null {
  const printed = toCents(receipt?.total);
  if (!total || printed === null) return null;
  return Math.abs(printed - total.total) > TOTAL_TOLERANCE_CENTS ? printed : null;
}

export function receiptExpenseFields(receipt: ParsedReceipt) {
  return {
    title: receipt.merchant ?? '',
    date: receipt.date ?? '',
    time: null,
    currency: receipt.currency,
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
