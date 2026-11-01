-- Read-only assertions after migrations 001-017 and seed. Run in a test
-- database before production, and again after deployment.
do $$
begin
  if has_function_privilege('anon','public.setting_json(text,jsonb)','execute')
     or has_function_privilege('authenticated','public.setting_json(text,jsonb)','execute')
     or has_function_privilege('anon','public.log_activity(text,text,text,text,text,jsonb,uuid)','execute')
     or has_function_privilege('authenticated','public.log_activity(text,text,text,text,text,jsonb,uuid)','execute')
     or has_function_privilege('anon','public.next_order_number()','execute')
     or has_function_privilege('anon','public.create_order(jsonb,text)','execute')
     or has_function_privilege('anon','public.record_cash_payment(uuid,text)','execute') then
    raise exception 'Internal SECURITY DEFINER function is executable by a browser role';
  end if;

  if not has_function_privilege('anon','public.get_store_status()','execute')
     or not has_function_privilege('authenticated','public.create_order(jsonb,text)','execute')
     or not has_function_privilege('authenticated','public.save_ingredient_with_inventory(jsonb,jsonb,uuid)','execute') then
    raise exception 'Required browser RPC permission is missing';
  end if;

  if not has_table_privilege('authenticated','public.delivery_zones','INSERT')
     or not (select relrowsecurity from pg_class where oid='public.delivery_zones'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.payment_methods'::regclass) then
    raise exception 'Commerce setup table grants or RLS are missing';
  end if;

  if exists (
    select 1 from public.payment_methods
    where active and instructions ~* '(configured by the restaurant|configured business account)'
  ) or exists (
    select 1 from public.delivery_zones
    where active and (areas && array['Central district','Nearby barangays','Outer service area']::text[])
  ) then
    raise exception 'Sample payment instructions or delivery areas are still active';
  end if;

  if position('Invalid order source.' in pg_get_functiondef('public.create_order(jsonb,text)'::regprocedure))=0
     or position('This order request belongs to another account.' in pg_get_functiondef('public.create_order(jsonb,text)'::regprocedure))=0
     or position('Payment proof file was not uploaded.' in pg_get_functiondef('public.submit_payment_proof(uuid,text,text)'::regprocedure))=0
     or position('Store ordering hours are not configured.' in pg_get_functiondef('public.get_store_status()'::regprocedure))=0
     or not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='payment_proofs_owner_cleanup') then
    raise exception 'Checkout integrity migration is missing';
  end if;

  if position('ordering_setup_confirmed' in pg_get_functiondef('public.get_store_status()'::regprocedure))=0
     or not exists(select 1 from public.settings where key='ordering_setup_confirmed' and not public_read) then
    raise exception 'Business confirmation gate is missing';
  end if;

  if has_table_privilege('authenticated','public.orders','UPDATE')
     or has_column_privilege('authenticated','public.inventory_items','current_quantity','UPDATE')
     or not has_column_privilege('authenticated','public.inventory_items','unit_cost','UPDATE')
     or has_table_privilege('authenticated','public.purchase_orders','UPDATE')
     or not has_function_privilege('authenticated','public.create_purchase_order(uuid,jsonb,date,text,text)','EXECUTE') then
    raise exception 'Atomic purchase-order or audited-write permissions are missing';
  end if;

  if position('order_ctx.variant_id' in pg_get_functiondef('public.create_order(jsonb,text)'::regprocedure))=0
     or position('public.product_variants%rowtype' in pg_get_functiondef('public.create_order(jsonb,text)'::regprocedure))=0 then
    raise exception 'Order snapshot fix is missing';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.orders'::regclass
      and tgname='orders_require_items'
      and tgconstraint<>0
      and tgdeferrable
      and tginitdeferred
      and tgenabled<>'D'
  ) then
    raise exception 'Empty orders are not blocked at transaction commit';
  end if;
end $$;
