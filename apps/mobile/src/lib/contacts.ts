import { apiFetch } from '@/lib/api';
import type { ContactKind, ContactSetting, PublicProfile } from '@/types';

type ContactMeta = {
  label: string;
  placeholder: string;
  /** Handles are shown and entered with a leading "@". */
  handle: boolean;
  keyboardType: 'default' | 'email-address' | 'phone-pad';
  /** Link that opens the contact in its app, if there is one. */
  url?: (value: string) => string;
};

/** Display order and metadata. Must match `CONTACT_KINDS` in apps/api/app/schemas/profile.py. */
export const CONTACTS: Record<ContactKind, ContactMeta> = {
  instagram: {
    label: 'Instagram',
    placeholder: 'username',
    handle: true,
    keyboardType: 'default',
    url: (value) => `https://instagram.com/${encodeURIComponent(value)}`,
  },
  snapchat: {
    label: 'Snapchat',
    placeholder: 'username',
    handle: true,
    keyboardType: 'default',
    url: (value) => `https://www.snapchat.com/add/${encodeURIComponent(value)}`,
  },
  whatsapp: {
    label: 'WhatsApp',
    placeholder: '+1 604 555 0123',
    handle: false,
    keyboardType: 'phone-pad',
    url: (value) => `https://wa.me/${value.replace(/\D/g, '')}`,
  },
  etransfer_email: {
    label: 'E-transfer email',
    placeholder: 'you@example.com',
    handle: false,
    keyboardType: 'email-address',
  },
  etransfer_phone: {
    label: 'E-transfer phone',
    placeholder: '+1 604 555 0123',
    handle: false,
    keyboardType: 'phone-pad',
  },
};

export function formatContact(kind: ContactKind, value: string): string {
  return CONTACTS[kind].handle ? `@${value}` : value;
}

export function getMyContacts(): Promise<{ contacts: ContactSetting[] }> {
  return apiFetch<{ contacts: ContactSetting[] }>('/me/contacts');
}

export function saveMyContacts(contacts: ContactSetting[]): Promise<{ contacts: ContactSetting[] }> {
  return apiFetch<{ contacts: ContactSetting[] }>('/me/contacts', {
    method: 'PUT',
    body: JSON.stringify({ contacts }),
  });
}

/** 404s unless you're friends or share an event. */
export function getUser(userId: string): Promise<PublicProfile> {
  return apiFetch<PublicProfile>(`/users/${userId}`);
}
