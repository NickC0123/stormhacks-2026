import { apiFetch } from '@/lib/api';
import type { ContactKind, ContactSetting, PublicProfile } from '@/types';

type ContactMeta = {
  label: string;
  placeholder: string;
  /** Shown before the value, both in the input and on profiles, e.g. "@". */
  prefix?: string;
  keyboardType: 'default' | 'email-address' | 'phone-pad';
  /** +1 phone number, saved as "+1 (604) 555-0123". */
  phone?: boolean;
  /** Link that opens the contact in its app, if there is one. */
  url?: (value: string) => string;
};

/** Display order and metadata. Must match `CONTACT_KINDS` in apps/api/app/schemas/profile.py. */
export const CONTACTS: Record<ContactKind, ContactMeta> = {
  instagram: {
    label: 'Instagram',
    placeholder: 'username',
    prefix: '@',
    keyboardType: 'default',
    url: (value) => `https://instagram.com/${encodeURIComponent(value)}`,
  },
  facebook: {
    label: 'Facebook',
    placeholder: 'username',
    prefix: 'facebook.com/',
    keyboardType: 'default',
    url: (value) => `https://www.facebook.com/${encodeURIComponent(value)}`,
  },
  whatsapp: {
    label: 'WhatsApp',
    placeholder: '(604) 555-0123',
    keyboardType: 'phone-pad',
    phone: true,
    url: (value) => `https://wa.me/${value.replace(/\D/g, '')}`,
  },
  etransfer_email: {
    label: 'E-transfer email',
    placeholder: 'you@example.com',
    keyboardType: 'email-address',
  },
  etransfer_phone: {
    label: 'E-transfer phone',
    placeholder: '(604) 555-0123',
    keyboardType: 'phone-pad',
    phone: true,
  },
};

/**
 * Formats a +1 number as the user types: "604" → "(604", "6045550123" → "(604) 555-0123".
 * A leading 1 is the country code (area codes never start with 1), so it's dropped.
 * Must match `normalize_phone` in apps/api/app/services/contacts.py.
 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatContact(kind: ContactKind, value: string): string {
  return `${CONTACTS[kind].prefix ?? ''}${value}`;
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
