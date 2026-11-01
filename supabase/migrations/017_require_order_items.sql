-- Missing JSON keys produce SQL NULL, so the create_order payload check can
-- otherwise evaluate to NULL and allow an empty order to be committed.
-- Check at transaction end so create_order can add its order-item snapshots
-- after inserting the parent order.
create or replace function public.enforce_order_has_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.order_items
    where order_id = new.id
  ) then
    raise exception 'An order must contain at least one item.';
  end if;
  return null;
end;
$$;

revoke all on function public.enforce_order_has_items() from public, anon, authenticated;

drop trigger if exists orders_require_items on public.orders;
create constraint trigger orders_require_items
after insert on public.orders
deferrable initially deferred
for each row
execute function public.enforce_order_has_items();
