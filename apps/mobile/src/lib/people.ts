import { apiFetch } from '@/lib/api';
import { getEvent } from '@/lib/events';
import type { EventInvite, EventUser, IncomingExpenseInvite, PersonAdded } from '@/types';

export type PeopleKind = 'event' | 'expense';
export type PeopleDetail = { created_by: string; members: EventUser[]; invites: EventInvite[] };
const base = (kind: PeopleKind, id: string) => `/${kind === 'event' ? 'events' : 'expenses'}/${id}`;

export function getPeople(kind: PeopleKind, id: string): Promise<PeopleDetail> {
  return kind === 'event' ? getEvent(id) : apiFetch<PeopleDetail>(`${base(kind, id)}/people`);
}

export function addPerson(kind: PeopleKind, id: string, person: { user_id: string } | { username: string }) {
  return apiFetch<PersonAdded>(`${base(kind, id)}/invites`, { method: 'POST', body: JSON.stringify(person) });
}

export function removePerson(kind: PeopleKind, id: string, userId: string) {
  return apiFetch<void>(`${base(kind, id)}/members/${userId}`, { method: 'DELETE' });
}

export function cancelPeopleInvite(kind: PeopleKind, inviteId: string) {
  return apiFetch<void>(`/${kind === 'event' ? 'invites' : 'expense-invites'}/${inviteId}`, { method: 'DELETE' });
}

export const listExpenseInvites = () => apiFetch<IncomingExpenseInvite[]>('/expense-invites');
export const acceptExpenseInvite = (id: string) => apiFetch<{ id: string; title: string }>(
  `/expense-invites/${id}/accept`, { method: 'POST' },
);
