-- Keep operational totals and stock changes behind audited RPCs.
revoke update on public.orders from authenticated;
revoke update on public.inventory_items from authenticated;
grant update (sku,reorder_level,preferred_stock,unit_cost,supplier_id,expiration_date,active)
  on public.inventory_items to authenticated;
revoke update,delete on public.purchase_orders, public.purchase_order_items from authenticated;

-- One request creates a complete purchase order, or rolls it all back.
alter table public.purchase_orders add column if not exists idempotency_key text;
create unique index if not exists purchase_orders_idempotency_key_unique
  on public.purchase_orders(idempotency_key) where idempotency_key is not null;

create or replace function public.create_purchase_order(
  p_supplier_id uuid,p_lines jsonb,p_expected_date date,p_notes text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  actor uuid:=auth.uid(); po public.purchase_orders%rowtype;
  item jsonb; item_id uuid; seen uuid[]:='{}'; qty numeric; cost numeric;
begin
  if actor is null or public.current_role() not in ('MANAGER','ADMIN') then
    raise exception 'Manager or administrator authorization required.' using errcode='42501';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key))<8 then
    raise exception 'A valid request key is required.';
  end if;
  select * into po from public.purchase_orders where idempotency_key=p_idempotency_key;
  if found then
    if po.created_by is distinct from actor then
      raise exception 'This purchase order request belongs to another account.' using errcode='42501';
    end if;
    return jsonb_build_object('id',po.id,'po_number',po.po_number,'idempotent_replay',true);
  end if;
  if not exists(select 1 from public.suppliers where id=p_supplier_id and active) then
    raise exception 'Select an active supplier.';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array'
     or jsonb_array_length(p_lines) not between 1 and 100 then
    raise exception 'Add 1 to 100 purchase order items.';
  end if;
  if p_expected_date is not null and p_expected_date<current_date then
    raise exception 'Expected date cannot be in the past.';
  end if;
  for item in select * from jsonb_array_elements(p_lines) loop
    item_id:=nullif(item->>'inventory_item_id','')::uuid;
    qty:=(item->>'requested_quantity')::numeric;
    cost:=(item->>'unit_cost')::numeric;
    if item_id is null or item_id=any(seen) or qty is null or qty<=0 or cost is null or cost<0 then
      raise exception 'Purchase order item is invalid or duplicated.';
    end if;
    if not exists(select 1 from public.inventory_items where id=item_id and active) then
      raise exception 'Select an active inventory item.';
    end if;
    seen:=array_append(seen,item_id);
  end loop;
  insert into public.purchase_orders(
    po_number,supplier_id,status,ordered_date,expected_date,notes,created_by,idempotency_key
  ) values (
    'PO-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
    p_supplier_id,'ORDERED',current_date,p_expected_date,left(trim(coalesce(p_notes,'')),2000),actor,p_idempotency_key
  ) on conflict (idempotency_key) where idempotency_key is not null do nothing
  returning * into po;
  if not found then
    select * into po from public.purchase_orders where idempotency_key=p_idempotency_key;
    if po.created_by is distinct from actor then
      raise exception 'This purchase order request belongs to another account.' using errcode='42501';
    end if;
    return jsonb_build_object('id',po.id,'po_number',po.po_number,'idempotent_replay',true);
  end if;
  insert into public.purchase_order_items(
    purchase_order_id,inventory_item_id,requested_quantity,unit_cost
  ) select po.id,(value->>'inventory_item_id')::uuid,
           (value->>'requested_quantity')::numeric,(value->>'unit_cost')::numeric
    from jsonb_array_elements(p_lines);
  perform public.log_activity('CREATE','PURCHASE_ORDERS','purchase_order',po.id::text,
    'Purchase order '||po.po_number||' created',jsonb_build_object('items',jsonb_array_length(p_lines)),actor);
  return jsonb_build_object('id',po.id,'po_number',po.po_number);
end $$;

revoke all on function public.create_purchase_order(uuid,jsonb,date,text,text) from public,anon;
grant execute on function public.create_purchase_order(uuid,jsonb,date,text,text) to authenticated;
