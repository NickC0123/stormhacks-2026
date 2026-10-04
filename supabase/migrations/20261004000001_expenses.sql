-- Expenses are independent of receipts and may optionally belong to an event.
-- Items are saved with the expense in one atomic write. Receipt JSON is retained
-- separately so attaching an image or correcting an expense never loses the scan.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  date date not null,
  time time,
  currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  amount numeric(12, 2) not null check (amount >= 0),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  parsed_receipt jsonb,
  receipt_image_path text,
  created_at timestamptz not null default now()
);

create index on public.expenses (created_by, date desc, created_at desc);
create index on public.expenses (event_id);
alter table public.expenses enable row level security;
-- Access goes through the authenticated API, which scopes every query to its user.
grant all on public.expenses to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;
