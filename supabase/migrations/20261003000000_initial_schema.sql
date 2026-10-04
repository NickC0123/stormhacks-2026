-- Initial schema draft. Apply to the hosted Supabase project.
-- RLS is enabled on every table; the FastAPI backend uses the service-role key.
-- Add policies before letting the mobile app query tables directly.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.event_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  paid_by uuid not null references public.profiles (id),
  merchant text,
  purchased_at timestamptz,
  currency text not null default 'CAD',
  subtotal numeric(12, 2),
  tax numeric(12, 2),
  tip numeric(12, 2),
  total numeric(12, 2) not null,
  image_path text,
  created_at timestamptz not null default now()
);

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  name text not null,
  quantity numeric(10, 3) not null default 1,
  unit_price numeric(12, 2) not null,
  category text
);

-- Which users share each item; share is a relative weight.
create table public.item_splits (
  item_id uuid not null references public.receipt_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  share numeric(10, 4) not null default 1 check (share > 0),
  primary key (item_id, user_id)
);

-- Recorded repayments between users.
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid not null references public.profiles (id),
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  note text,
  photo_path text,
  created_at timestamptz not null default now(),
  check (note is not null or photo_path is not null)
);

create index on public.event_members (user_id);
create index on public.receipts (event_id);
create index on public.receipt_items (receipt_id);
create index on public.item_splits (user_id);
create index on public.memories (event_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.item_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.memories enable row level security;
