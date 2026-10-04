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
  | 'coffee'
  | 'food'
  | 'drinks'
  | 'alcohol'
  | 'groceries'
  | 'transport'
  | 'entertainment'
  | 'shopping'
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

/** Keys match the API JSON exactly. `username` is null until the user picks one. */
export type Profile = {
  id: UUID;
  username: string | null;
  display_name: string;
};

export type FriendUser = {
  id: UUID;
  username: string;
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
};

export type EventSummary = {
  id: UUID;
  title: string;
  starts_at: string | null;
};

export type EventListItem = EventSummary & {
  description: string | null;
  created_by: UUID;
  created_at: string;
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
