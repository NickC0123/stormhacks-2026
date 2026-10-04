import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'balance-paid-checks';

/** Map of `userId:currency` → expense ids marked paid/received. */
export type PaidChecksMap = Record<string, string[]>;

export function paidStorageKey(userId: string, currency: string) {
  return `${userId}:${currency}`;
}

export async function loadPaidChecks(): Promise<PaidChecksMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as PaidChecksMap;
  } catch {
    return {};
  }
}

export async function savePaidChecks(map: PaidChecksMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Keep only expense ids that still exist on the person. */
export function prunePaidIds(saved: string[] | undefined, expenseIds: string[]): string[] {
  if (!saved?.length) return [];
  const valid = new Set(expenseIds);
  return saved.filter((id) => valid.has(id));
}
