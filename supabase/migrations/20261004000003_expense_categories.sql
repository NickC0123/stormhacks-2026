-- Bring saved expense items and scanned receipt data onto the current categories.
-- Keep the order and every other field of each JSON item intact.
create function pg_temp.new_expense_category(category text) returns text
language sql immutable as $$
  select case category
    when 'coffee' then 'food_drinks'
    when 'food' then 'food_drinks'
    when 'drinks' then 'food_drinks'
    when 'alcohol' then 'food_drinks'
    when 'transport' then 'transportation'
    else category
  end;
$$;

update public.expenses e
set items = (
  select jsonb_agg(
    case when item->>'category' in ('coffee', 'food', 'drinks', 'alcohol', 'transport')
      then jsonb_set(item, '{category}', to_jsonb(pg_temp.new_expense_category(item->>'category')))
      else item
    end
    order by position
  )
  from jsonb_array_elements(e.items) with ordinality as entries(item, position)
)
where exists (
  select 1 from jsonb_array_elements(e.items) item
  where item->>'category' in ('coffee', 'food', 'drinks', 'alcohol', 'transport')
);

update public.expenses e
set parsed_receipt = jsonb_set(e.parsed_receipt, '{items}', (
  select jsonb_agg(
    case when item->>'category' in ('coffee', 'food', 'drinks', 'alcohol', 'transport')
      then jsonb_set(item, '{category}', to_jsonb(pg_temp.new_expense_category(item->>'category')))
      else item
    end
    order by position
  )
  from jsonb_array_elements(e.parsed_receipt->'items') with ordinality as entries(item, position)
))
where jsonb_typeof(e.parsed_receipt->'items') = 'array'
  and exists (
    select 1 from jsonb_array_elements(e.parsed_receipt->'items') item
    where item->>'category' in ('coffee', 'food', 'drinks', 'alcohol', 'transport')
  );

update public.receipt_items
set category = pg_temp.new_expense_category(category)
where category in ('coffee', 'food', 'drinks', 'alcohol', 'transport');
