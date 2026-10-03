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
