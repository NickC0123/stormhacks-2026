// Shared domain types. Keep in sync with the Pydantic schemas in apps/api/app/schemas.

export type UUID = string;

export type Event = {
  id: UUID;
  title: string;
  description?: string | null;
  startsAt?: string | null;
  createdBy: UUID;
};

export type ReceiptItem = {
  id: UUID;
  receiptId: UUID;
  name: string;
  quantity: number;
  unitPrice: number;
  category?: string | null;
};

export type Receipt = {
  id: UUID;
  eventId: UUID;
  paidBy: UUID;
  merchant?: string | null;
  total: number;
  imagePath?: string | null;
  items: ReceiptItem[];
};

export type ItemCategory =
  | 'groceries'
  | 'food_drinks'
  | 'transportation'
  | 'shopping'
  | 'entertainment'
  | 'housing'
  | 'bills_utilities'
  | 'subscriptions'
  | 'health_fitness'
  | 'education'
  | 'personal_care'
  | 'work'
  | 'other';

/** Money values are strings with two decimals, e.g. "10.00". Keys match the API JSON exactly. */
export type ParsedReceiptItem = {
  description: string;
  normalized_name: string;
  category: ItemCategory;
  quantity: number;
  unit_price: string | null;
  line_total: string;
};

export type ParsedReceipt = {
  merchant: string | null;
  date: string | null;
  currency: string;
  items: ParsedReceiptItem[];
  subtotal: string | null;
  discount: string;
  tax: string | null;
  tip: string;
  total: string | null;
  warnings: string[];
};

/** iOS system accent name stored on the profile for initials avatars. */
export type AvatarColor =
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'mint'
  | 'teal'
  | 'cyan'
  | 'indigo'
  | 'brown';

export const AVATAR_COLORS: readonly AvatarColor[] = [
  'blue',
  'purple',
  'pink',
  'red',
  'orange',
  'yellow',
  'green',
  'mint',
  'teal',
  'cyan',
  'indigo',
  'brown',
] as const;

/** Keys match the API JSON exactly. `username` is null until the user picks one. */
export type Profile = {
  id: UUID;
  username: string | null;
  display_name: string;
  avatar_color: AvatarColor;
};

export type ContactKind = 'instagram' | 'facebook' | 'whatsapp' | 'etransfer_email' | 'etransfer_phone';

/** One of the signed-in user's contact fields. Others only see it when `visible`. */
export type ContactSetting = {
  kind: ContactKind;
  value: string | null;
  visible: boolean;
};

export type Contact = {
  kind: ContactKind;
  value: string;
};

/** Another user's profile, with only the contacts they chose to show. */
export type PublicProfile = {
  id: UUID;
  username: string | null;
  avatar_color: AvatarColor;
  contacts: Contact[];
};

export type FriendUser = {
  id: UUID;
  username: string;
  avatar_color: AvatarColor;
};

/** A friend or pending request, seen from the signed-in user's side. */
export type Friendship = {
  id: UUID;
  user: FriendUser;
  status: 'pending' | 'accepted';
  created_at: string;
  accepted_at: string | null;
};

export type FriendsOverview = {
  friends: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
};

/** Keys match the API JSON exactly. `username` is null only for legacy profiles. */
export type EventUser = {
  id: UUID;
  username: string | null;
  avatar_color: AvatarColor;
};

export type EventSummary = {
  id: UUID;
  title: string;
  starts_at: string | null;
};

export type EventPhotoPreview = {
  id: UUID;
  url: string;
};

export type EventListItem = EventSummary & {
  description: string | null;
  created_by: UUID;
  created_at: string;
};

/** Home feed event with cover photos and members. */
export type EventHomeItem = EventListItem & {
  photo_count: number;
  preview_photos: EventPhotoPreview[];
  members: EventUser[];
};

/** A pending invite as seen by members of the event. */
export type EventInvite = {
  id: UUID;
  user: EventUser;
  invited_by: EventUser;
  created_at: string;
};

/** A pending invite as seen by the person invited. */
export type IncomingInvite = {
  id: UUID;
  event: EventSummary;
  invited_by: EventUser;
  created_at: string;
};

export type EventDetail = EventListItem & {
  members: EventUser[];
  invites: EventInvite[];
};

export type Balance = {
  fromUserId: UUID;
  toUserId: UUID;
  amount: number;
};

export type Memory = {
  id: UUID;
  eventId: UUID;
  authorId: UUID;
  note?: string | null;
  photoPath?: string | null;
  createdAt: string;
};

/** A photo someone in the event added. `url` is a short-lived signed link. */
export type EventPhoto = {
  id: UUID;
  event_id: UUID;
  author_id: UUID;
  url: string;
  created_at: string;
};

export type ExpenseItem = {
  id?: UUID;
  name: string;
  category: ItemCategory;
  amount: string;
  quantity?: number | string;
  unit_price?: string | null;
};

export type ExpenseWrite = {
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  currency: string;
  amount: string;
  event_id: UUID | null;
  items: ExpenseItem[];
  parsed_receipt: ParsedReceipt | null;
};

export type Expense = ExpenseWrite & {
  id: UUID;
  created_by: UUID;
  created_at: string;
  receipt_image_path: string | null;
};

export type PersonAdded = {
  status: 'added' | 'invited';
  user: EventUser;
  invite: EventInvite | null;
};

export type IncomingExpenseInvite = {
  id: UUID;
  expense: { id: UUID; title: string };
  invited_by: EventUser;
  created_at: string;
};

export type ExpenseSplit = {
  expense_id: string;
  paid_by: EventUser;
  currency: string;
  total: string;
  customized: boolean;
  shares: { user: EventUser; amount: string }[];
};

/**
 * Your own share of spending by item category, converted to CAD at fixed approximate rates.
 * Amounts are "10.00" strings.
 */
export type SpendingSummary = {
  currency: 'CAD';
  total: string;
  by_category: { category: string; amount: string }[];
  /** Expenses in these currencies have no rate and are left out. */
  unconverted_currencies: string[];
};

export type BalanceDashboard = {
  totals: { currency: string; you_owe: string; owed_to_you: string }[];
  people: {
    user: EventUser;
    currency: string;
    you_owe: string;
    owed_to_you: string;
    expenses: {
      expense_id: string;
      title: string;
      amount: string;
      event_id?: string | null;
      event_title?: string | null;
      event_starts_at?: string | null;
      date?: string | null;
    }[];
    /** Recorded payments. Positive: you paid them. Negative: they paid you. */
    settlements: { id: string; amount: string; created_at: string }[];
    /** Their visible e-transfer details, only while you owe them. */
    payment_contacts: Contact[];
  }[];
  /** Amounts are in CAD; expenses in these currencies have no rate and are left out. */
  unconverted_currencies: string[];
};
