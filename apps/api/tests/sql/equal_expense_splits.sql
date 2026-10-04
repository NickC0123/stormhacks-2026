-- Isolated database test. Apply existing migrations, run the fixture section,
-- apply 20261004000007_equal_expense_splits.sql, then run the assertion section.
-- FIXTURES
insert into auth.users (id) select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 5) n;
insert into public.profiles (id, display_name) select id, id::text from auth.users;
insert into public.events (id, created_by, title) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Trip'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Dinner');
insert into public.event_members (event_id, user_id) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004');
insert into public.expenses (id, created_by, event_id, title, date, amount) values
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Default', current_date, 90),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Custom', current_date, 90),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', null, 'Solo', current_date, 90);
insert into public.expense_members (expense_id, user_id) values
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004');
insert into public.expense_invites (expense_id, inviter_id, invitee_id) values
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');

-- ASSERTIONS
-- Existing event expenses get defaults; existing explicit selections remain intact.
do $$ begin
  if (select count(*) from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000001') <> 3 then raise exception 'Backfill missed event defaults'; end if;
  if (select count(*) from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000002') <> 2 then raise exception 'Backfill overwrote custom participants'; end if;
  if not (select split_customized from public.expenses where id = '20000000-0000-0000-0000-000000000002') then raise exception 'Existing custom selection not tracked'; end if;
  if exists (select 1 from public.expense_balance_inputs('00000000-0000-0000-0000-000000000005')) then raise exception 'Unrelated user sees expenses'; end if;
  if (select count(*) from public.expense_balance_inputs('00000000-0000-0000-0000-000000000003')) <> 1 then raise exception 'Pending invite affected access'; end if;
  if has_function_privilege('anon', 'public.expense_balance_inputs(uuid,uuid)', 'execute') then raise exception 'Anonymous role can read balances'; end if;
end $$;
insert into public.expenses (id, created_by, event_id, title, date, amount) values
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'New', current_date, 90);
do $$ begin
  if (select count(*) from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000004') <> 3 then raise exception 'New expense not initialized'; end if;
  if (select split_customized from public.expenses where id = '20000000-0000-0000-0000-000000000004') then raise exception 'Defaults marked customized'; end if;
end $$;
insert into public.expense_members (expense_id, user_id) values
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004');
delete from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000004' and user_id = '00000000-0000-0000-0000-000000000002';
update public.expenses set amount = 120, event_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000004';
do $$ begin
  if (select count(*) from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000004') <> 3 then raise exception 'Update overwrote explicit participants'; end if;
  if not (select split_customized from public.expenses where id = '20000000-0000-0000-0000-000000000004') then raise exception 'Manual edits not tracked'; end if;
end $$;
update public.expenses set event_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000001') <> 2 then raise exception 'Relinking default expense missed new members'; end if;
  if (select split_customized from public.expenses where id = '20000000-0000-0000-0000-000000000001') then raise exception 'Relinking defaults marked custom'; end if;
end $$;
-- A pending invitation makes the selection explicit without counting as a participant.
insert into public.expense_invites (expense_id, inviter_id, invitee_id) values
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005');
update public.expenses set event_id = '10000000-0000-0000-0000-000000000001' where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000001') <> 2 then raise exception 'Pending invitation did not preserve custom selection'; end if;
  if exists (select 1 from public.expense_balance_inputs('00000000-0000-0000-0000-000000000005')) then raise exception 'Pending invitation counted as participation'; end if;
end $$;
-- Excluding the payer does not remove their ability to see the expense.
delete from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000004' and user_id = '00000000-0000-0000-0000-000000000001';
do $$ begin
  if not exists (select 1 from public.expense_balance_inputs('00000000-0000-0000-0000-000000000001') where id = '20000000-0000-0000-0000-000000000004') then raise exception 'Payer lost access'; end if;
  begin
    delete from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000003';
    raise exception 'Last participant was removable';
  exception when check_violation then null;
  end;
  if (select count(*) from public.expense_members where expense_id = '20000000-0000-0000-0000-000000000003') <> 1 then raise exception 'Failed delete was not rolled back'; end if;
end $$;
-- An expense cascade may delete the last participant.
delete from public.expenses where id = '20000000-0000-0000-0000-000000000003';
select 'Equal split migration checks passed' as result;
