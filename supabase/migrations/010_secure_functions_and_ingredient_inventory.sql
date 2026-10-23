-- Existing databases may contain older public RPCs outside this repository.
-- Restrict the known private helpers without changing those unrelated grants.
revoke execute on function public.setting_json(text,jsonb) from public, anon, authenticated;
revoke execute on function public.setting_text(text,text) from public, anon, authenticated;
revoke execute on function public.setting_numeric(text,numeric) from public, anon, authenticated;
revoke execute on function public.setting_boolean(text,boolean) from public, anon, authenticated;
revoke execute on function public.log_activity(text,text,text,text,text,jsonb,uuid) from public, anon, authenticated;
revoke execute on function public.next_order_number() from public, anon, authenticated;

grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.get_store_status() to anon, authenticated;
grant execute on function public.check_product_availability(uuid,uuid,integer,uuid[]) to anon, authenticated;
grant execute on function public.can_review_product(uuid,uuid) to authenticated;
grant execute on function public.create_order(jsonb,text) to authenticated;
grant execute on function public.update_order_status(uuid,text,text) to authenticated;
grant execute on function public.cancel_order(uuid,text) to authenticated;
grant execute on function public.submit_payment_proof(uuid,text,text) to authenticated;
grant execute on function public.verify_payment(uuid,text,text,text) to authenticated;
grant execute on function public.record_refund(uuid,numeric,text,text) to authenticated;
grant execute on function public.adjust_inventory(uuid,numeric,text,text,text) to authenticated;
grant execute on function public.receive_purchase_order(uuid,jsonb,text) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.dashboard_kpis() to authenticated;
grant execute on function public.sales_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.product_performance_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.category_performance_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.order_volume_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.record_cash_payment(uuid,text) to authenticated;

-- A single transaction creates or updates the catalog entry and its stock
-- record. Opening stock remains zero; additions must use adjust_inventory so
-- every quantity change has an inventory movement.
create or replace function public.save_ingredient_with_inventory(
  p_ingredient jsonb,
  p_inventory jsonb,
  p_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  item public.ingredients%rowtype;
  stock public.inventory_items%rowtype;
  ingredient_name text:=trim(coalesce(p_ingredient->>'name',''));
  ingredient_unit text:=trim(coalesce(p_ingredient->>'unit',''));
  stock_sku text:=trim(coalesce(p_inventory->>'sku',''));
  supplier uuid:=nullif(p_inventory->>'supplier_id','')::uuid;
  reorder_qty numeric:=coalesce((p_inventory->>'reorder_level')::numeric,0);
  preferred_qty numeric:=coalesce((p_inventory->>'preferred_stock')::numeric,0);
  cost numeric:=coalesce((p_inventory->>'unit_cost')::numeric,0);
  enabled boolean:=coalesce((p_ingredient->>'active')::boolean,true);
begin
  if not public.is_admin() then
    raise exception 'Administrator authorization required.' using errcode='42501';
  end if;
  if ingredient_name='' or ingredient_unit not in ('pc','g','kg','ml','l','slice','pack','serving') or stock_sku='' then
    raise exception 'Ingredient name, valid unit and inventory SKU are required.';
  end if;
  if reorder_qty<0 or preferred_qty<0 or cost<0 then
    raise exception 'Inventory targets and unit cost cannot be negative.';
  end if;
  if supplier is not null and not exists(select 1 from public.suppliers where id=supplier and active) then
    raise exception 'Choose an active supplier.';
  end if;

  if p_id is null then
    insert into public.ingredients(name,category,unit,active)
    values(ingredient_name,nullif(trim(coalesce(p_ingredient->>'category','')),''),ingredient_unit,enabled)
    returning * into item;
  else
    update public.ingredients
    set name=ingredient_name,
        category=nullif(trim(coalesce(p_ingredient->>'category','')),''),
        unit=ingredient_unit,
        active=enabled
    where id=p_id returning * into item;
    if not found then raise exception 'Ingredient not found.'; end if;
  end if;

  insert into public.inventory_items(
    ingredient_id,sku,reorder_level,preferred_stock,unit_cost,supplier_id,active
  ) values(item.id,stock_sku,reorder_qty,preferred_qty,cost,supplier,enabled)
  on conflict(ingredient_id) do update set
    sku=excluded.sku,
    reorder_level=excluded.reorder_level,
    preferred_stock=excluded.preferred_stock,
    unit_cost=excluded.unit_cost,
    supplier_id=excluded.supplier_id,
    active=excluded.active
  returning * into stock;

  return jsonb_build_object('ingredient_id',item.id,'inventory_item_id',stock.id);
end $$;

revoke execute on function public.save_ingredient_with_inventory(jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.save_ingredient_with_inventory(jsonb,jsonb,uuid) to authenticated;

-- The ingredient list's Activate/Deactivate action updates the ingredient row
-- directly, so keep its stock record in the same state.
create or replace function public.sync_ingredient_inventory_status()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.inventory_items set active=new.active where ingredient_id=new.id;
  return new;
end $$;
drop trigger if exists ingredient_inventory_status on public.ingredients;
create trigger ingredient_inventory_status
after update of active on public.ingredients
for each row when (old.active is distinct from new.active)
execute function public.sync_ingredient_inventory_status();
revoke execute on function public.sync_ingredient_inventory_status() from public, anon, authenticated;
