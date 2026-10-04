import { useFocusedData } from '@/hooks/useFocusedData';
import { listEvents, listIncomingInvites } from '@/lib/events';

export type EventsHomeState = ReturnType<typeof useEventsHome>;

const loadHome = () =>
  Promise.all([listIncomingInvites(), listEvents()]).then(([invites, events]) => ({ invites, events }));

/** Pending invites and the user's events, reloaded on focus. */
export function useEventsHome() {
  return useFocusedData(loadHome, 'Could not load your events.');
}
