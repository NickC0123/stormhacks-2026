-- Isolated database test. Apply migrations through 20261004000009, run the fixture
-- section, apply 20261004000010_late_event_members_join_expenses.sql, then run the
-- assertion section.
-- FIXTURES
insert into auth.users (id) select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 5) n;
insert into public.profiles (id, display_name) select id, id::text from auth.users;
insert into public.events (id, created_by, title) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Trip'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Dinner');
insert into public.event_members (event_id, user_id) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');
insert into public.expenses (id, created_by, event_id, title, date, amount) values
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Default', current_date, 90),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Custom', current_date, 90),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Other event', current_date, 90),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', null, 'Solo', current_date, 90);
-- The creator removes user 2 by hand, so this expense keeps its own selection.
delete from public.expense_members
where expense_id = '20000000-0000-0000-0000-000000000002' and user_id = '00000000-0000-0000-0000-000000000002';
-- User 3 joins the trip before the migration, so they are missing from its expenses.
insert into public.event_members (event_id, user_id) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');
-- ASSERTIONS
do $$
declare
  trip constant uuid := '10000000-0000-0000-0000-000000000001';
  dflt constant uuid := '20000000-0000-0000-0000-000000000001';
  custom constant uuid := '20000000-0000-0000-0000-000000000002';
  other constant uuid := '20000000-0000-0000-0000-000000000003';
  solo constant uuid := '20000000-0000-0000-0000-000000000004';
  u3 constant uuid := '00000000-0000-0000-0000-000000000003';
  u4 constant uuid := '00000000-0000-0000-0000-000000000004';
  u5 constant uuid := '00000000-0000-0000-0000-000000000005';
begin
  if not exists (select 1 from public.expense_members where expense_id = dflt and user_id = u3) then
    raise exception 'Earlier member not caught up'; end if;
  if (select split_customized from public.expenses where id = dflt) then
    raise exception 'Catch-up marked the expense customized'; end if;
  if exists (select 1 from public.expense_members where expense_id = custom and user_id = u3) then
    raise exception 'Catch-up overrode a hand-picked split'; end if;

  insert into public.event_members (event_id, user_id) values (trip, u4);
  if (select array_agg(user_id order by user_id) from public.expense_members where expense_id = dflt)
     <> array['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', u3, u4]::uuid[] then
    raise exception 'New member not added to the event expense'; end if;
  if (select split_customized from public.expenses where id = dflt) then
    raise exception 'Joining marked the expense customized'; end if;
  if exists (select 1 from public.expense_members where expense_id = custom and user_id = u4) then
    raise exception 'Joining overrode a hand-picked split'; end if;
  if exists (select 1 from public.expense_members where user_id = u4 and expense_id in (other, solo)) then
    raise exception 'New member added to expenses outside the event'; end if;

  -- Already being in an expense is not an error.
  insert into public.expense_members (expense_id, user_id) values (other, u5);
  update public.expenses set split_customized = false where id = other;
  insert into public.event_members (event_id, user_id) values ('10000000-0000-0000-0000-000000000002', u5);
  if (select count(*) from public.expense_members where expense_id = other and user_id = u5) <> 1 then
    raise exception 'Existing participant duplicated'; end if;

  -- Later expenses still start with everyone, including late joiners.
  insert into public.expenses (id, created_by, event_id, title, date, amount)
  values ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', trip, 'Later', current_date, 40);
  if (select count(*) from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000005') <> 4 then
    raise exception 'New expense does not include every member'; end if;
end $$;
select 'late event member tests passed';
