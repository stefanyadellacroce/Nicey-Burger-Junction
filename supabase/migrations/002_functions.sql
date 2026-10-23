-- Core helper functions, triggers and transaction-safe workflows.

create or replace function public.current_role()
returns text language sql stable security definer set search_path=public,auth as $$
  select coalesce((select role from public.profiles where id=auth.uid() and active=true), 'ANON');
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public,auth as $$ select public.current_role()='ADMIN' $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public,auth as $$ select public.current_role() in ('STAFF','MANAGER','ADMIN') $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public,auth as $$
begin
  insert into public.profiles(id,full_name,phone,role,active)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.raw_user_meta_data->>'phone','CUSTOMER',true)
  on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.protect_profile_trusted_fields() returns trigger
language plpgsql security definer set search_path=public,auth as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active) and not public.is_admin() then
    raise exception 'Trusted profile fields may only be changed by an administrator.' using errcode='42501';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles for each row execute function public.protect_profile_trusted_fields();

create or replace function public.single_default_address() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.is_default then update public.user_addresses set is_default=false where customer_id=new.customer_id and id<>new.id and is_default=true; end if;
 return new;
end $$;
drop trigger if exists single_default_address_trigger on public.user_addresses;
create trigger single_default_address_trigger before insert or update of is_default on public.user_addresses for each row execute function public.single_default_address();

-- Updated-at triggers
DO $$ declare t text; begin
 foreach t in array array['profiles','user_addresses','categories','products','product_variants','addons','ingredients','suppliers','inventory_items','delivery_zones','carts','cart_items','promotions','orders','payment_methods','payments','purchase_orders','expenses'] loop
   execute format('drop trigger if exists %I_touch_updated_at on public.%I',t,t);
   execute format('create trigger %I_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t,t);
 end loop;
end $$;

create or replace function public.setting_json(p_key text, p_default jsonb default null)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce((select case when value ? 'value' then value->'value' else value end from public.settings where key=p_key),p_default);
$$;
create or replace function public.setting_text(p_key text,p_default text default null) returns text language sql stable security definer set search_path=public as $$ select coalesce(public.setting_json(p_key,to_jsonb(p_default))#>>'{}',p_default) $$;
create or replace function public.setting_numeric(p_key text,p_default numeric default 0) returns numeric language sql stable security definer set search_path=public as $$ select coalesce(nullif(public.setting_json(p_key,to_jsonb(p_default))#>>'{}','')::numeric,p_default) $$;
create or replace function public.setting_boolean(p_key text,p_default boolean default false) returns boolean language sql stable security definer set search_path=public as $$ select coalesce(nullif(public.setting_json(p_key,to_jsonb(p_default))#>>'{}','')::boolean,p_default) $$;

create or replace function public.get_store_status()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  tz text:=public.setting_text('timezone','Asia/Manila');
  now_local timestamp:=now() at time zone tz;
  dow int:=extract(dow from now_local);
  schedule jsonb:=public.setting_json('business_hours','{}'::jsonb);
  day jsonb;
  open_t time; close_t time;
begin
  if not public.setting_boolean('ordering_enabled',true) then return jsonb_build_object('open',false,'reason','Online ordering is temporarily disabled.'); end if;
  if public.setting_boolean('temporary_store_closure',false) then return jsonb_build_object('open',false,'reason',coalesce(public.setting_text('store_announcement','Store temporarily closed.'),'Store temporarily closed.')); end if;
  day:=schedule->dow::text;
  if day is null then return jsonb_build_object('open',true,'reason','Ordering is open.'); end if;
  if coalesce((day->>'closed')::boolean,false) then return jsonb_build_object('open',false,'reason','The restaurant is closed today.'); end if;
  open_t:=coalesce((day->>'open')::time,'00:00'::time); close_t:=coalesce((day->>'close')::time,'23:59:59'::time);
  if now_local::time < open_t or now_local::time > close_t then
    return jsonb_build_object('open',false,'reason',format('Ordering hours today are %s–%s.',to_char(open_t,'HH12:MI AM'),to_char(close_t,'HH12:MI AM')));
  end if;
  return jsonb_build_object('open',true,'reason','Ordering is open.','local_time',now_local);
end $$;

create or replace function public.check_product_availability(p_product_id uuid,p_variant_id uuid default null,p_quantity integer default 1,p_addon_ids uuid[] default '{}')
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare p public.products%rowtype; shortage text; schedule jsonb; tz text:=public.setting_text('timezone','Asia/Manila'); now_local timestamp:=now() at time zone tz; day jsonb;
begin
 if p_quantity<1 then return jsonb_build_object('available',false,'reason','Quantity must be positive.'); end if;
 select * into p from public.products where id=p_product_id;
 if not found or not p.active then return jsonb_build_object('available',false,'reason','Product is unavailable.'); end if;
 if p.manually_sold_out then return jsonb_build_object('available',false,'reason','Product is sold out.'); end if;
 if p_variant_id is not null and not exists(select 1 from public.product_variants where id=p_variant_id and product_id=p_product_id and active) then return jsonb_build_object('available',false,'reason','Selected variant is unavailable.'); end if;
 if exists(select 1 from unnest(coalesce(p_addon_ids,'{}'::uuid[])) x where not exists(select 1 from public.product_addons pa join public.addons a on a.id=pa.addon_id where pa.product_id=p_product_id and pa.addon_id=x and a.active)) then return jsonb_build_object('available',false,'reason','One or more add-ons are unavailable.'); end if;
 schedule:=p.availability_schedule;
 if schedule is not null then
   day:=schedule->(extract(dow from now_local)::int)::text;
   if day is not null and coalesce((day->>'enabled')::boolean,true)=false then return jsonb_build_object('available',false,'reason','This product is not scheduled today.'); end if;
   if day is not null and day ? 'start' and now_local::time < (day->>'start')::time then return jsonb_build_object('available',false,'reason','This product is not available yet.'); end if;
   if day is not null and day ? 'end' and now_local::time > (day->>'end')::time then return jsonb_build_object('available',false,'reason','This product is no longer available today.'); end if;
 end if;
 if p.track_recipe_availability then
   select i.name into shortage from (
     select pi.ingredient_id,sum(pi.quantity)*p_quantity required
     from public.product_ingredients pi
     where pi.product_id=p_product_id and ((pi.variant_id is null and pi.addon_id is null) or pi.variant_id=p_variant_id or pi.addon_id=any(coalesce(p_addon_ids,'{}'::uuid[])))
     group by pi.ingredient_id
   ) req join public.ingredients i on i.id=req.ingredient_id left join public.inventory_items inv on inv.ingredient_id=req.ingredient_id
   where coalesce(inv.current_quantity,0)<req.required limit 1;
   if shortage is not null then return jsonb_build_object('available',false,'reason',format('Unavailable because %s stock is insufficient.',shortage)); end if;
 end if;
 return jsonb_build_object('available',true,'reason','Available');
end $$;

create or replace function public.next_order_number()
returns text language plpgsql security definer set search_path=public as $$
declare d date:=current_date; n int; begin
 insert into public.daily_order_counters(order_date,counter) values(d,1)
 on conflict(order_date) do update set counter=public.daily_order_counters.counter+1 returning counter into n;
 return 'NBJ-'||to_char(d,'YYYYMMDD')||'-'||lpad(n::text,4,'0');
end $$;

create or replace function public.log_activity(p_action text,p_module text,p_record_type text,p_record_id text,p_description text,p_metadata jsonb default '{}'::jsonb,p_actor uuid default auth.uid())
returns void language sql security definer set search_path=public as $$
 insert into public.activity_logs(actor_id,action,module,record_type,record_id,description,metadata) values(p_actor,p_action,p_module,p_record_type,p_record_id,p_description,coalesce(p_metadata,'{}'::jsonb));
$$;

create or replace function public._deduct_inventory_for_order(p_order_id uuid,p_actor uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare inserted uuid; req record; inv public.inventory_items%rowtype; begin
 insert into public.inventory_order_deductions(order_id,deducted_by) values(p_order_id,p_actor) on conflict(order_id) do nothing returning order_id into inserted;
 if inserted is null then return false; end if;
 for req in select oii.ingredient_id,sum(oii.quantity_required) qty from public.order_item_ingredients oii join public.order_items oi on oi.id=oii.order_item_id where oi.order_id=p_order_id group by oii.ingredient_id loop
   select * into inv from public.inventory_items where ingredient_id=req.ingredient_id and active for update;
   if not found then raise exception 'Missing inventory record for ingredient %',req.ingredient_id; end if;
   if inv.current_quantity<req.qty then raise exception 'Insufficient inventory for SKU % (need %, have %)',inv.sku,req.qty,inv.current_quantity; end if;
   update public.inventory_items set current_quantity=current_quantity-req.qty where id=inv.id;
   insert into public.inventory_movements(inventory_item_id,movement_type,quantity_delta,previous_quantity,new_quantity,reference_type,reference_id,idempotency_key,actor_id,notes)
   values(inv.id,'SALE_USAGE',-req.qty,inv.current_quantity,inv.current_quantity-req.qty,'ORDER',p_order_id,'sale:'||p_order_id||':'||inv.id,p_actor,'Recipe usage for order');
 end loop;
 return true;
end $$;
revoke all on function public._deduct_inventory_for_order(uuid,uuid) from public,anon,authenticated;

create or replace function public._restore_inventory_for_order(p_order_id uuid,p_actor uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare d public.inventory_order_deductions%rowtype; req record; inv public.inventory_items%rowtype; begin
 select * into d from public.inventory_order_deductions where order_id=p_order_id for update;
 if not found or d.reversed_at is not null then return false; end if;
 for req in select oii.ingredient_id,sum(oii.quantity_required) qty from public.order_item_ingredients oii join public.order_items oi on oi.id=oii.order_item_id where oi.order_id=p_order_id group by oii.ingredient_id loop
   select * into inv from public.inventory_items where ingredient_id=req.ingredient_id for update;
   if found then
     update public.inventory_items set current_quantity=current_quantity+req.qty where id=inv.id;
     insert into public.inventory_movements(inventory_item_id,movement_type,quantity_delta,previous_quantity,new_quantity,reference_type,reference_id,idempotency_key,actor_id,notes)
     values(inv.id,'SALE_REVERSAL',req.qty,inv.current_quantity,inv.current_quantity+req.qty,'ORDER',p_order_id,'sale-reversal:'||p_order_id||':'||inv.id,p_actor,'Inventory restored after order cancellation');
   end if;
 end loop;
 update public.inventory_order_deductions set reversed_at=now(),reversed_by=p_actor where order_id=p_order_id;
 return true;
end $$;
revoke all on function public._restore_inventory_for_order(uuid,uuid) from public,anon,authenticated;

create or replace function public.create_order(p_payload jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
 actor uuid:=auth.uid(); actor_role text:=public.current_role(); customer uuid; source text:=upper(coalesce(p_payload->>'source','WEB'));
 fulfillment text:=upper(coalesce(p_payload->>'fulfillment_type','PICKUP')); payment_code text:=upper(coalesce(p_payload->>'payment_method','CASH'));
 customer_name text:=trim(coalesce(p_payload->>'customer_name','')); customer_email text:=lower(trim(coalesce(p_payload->>'customer_email',''))); customer_phone text:=trim(coalesce(p_payload->>'customer_phone',''));
 subtotal numeric:=0; eligible numeric:=0; discount numeric:=0; delivery_fee numeric:=0; service_fee numeric:=0; tax numeric:=0; total numeric:=0; tax_rate numeric:=0;
 item jsonb; product_rec record; variant_rec record; addon_rec record; qty int; variant_id uuid; addon_ids uuid[]; addon_id uuid; unit_price numeric; addons_total numeric; line_total numeric;
 promo public.promotions%rowtype; zone public.delivery_zones%rowtype; method public.payment_methods%rowtype; ord public.orders%rowtype; order_item_id uuid; order_no text; store jsonb;
 initial_payment_status text:='PENDING'; estimated int:=20; n_items int:=0;
begin
 if p_idempotency_key is null or length(trim(p_idempotency_key))<8 then raise exception 'A valid idempotency key is required.'; end if;
 select * into ord from public.orders where idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('order_id',ord.id,'order_number',ord.order_number,'total',ord.total,'status',ord.status,'payment_status',ord.payment_status,'idempotent_replay',true); end if;
 if actor is null then raise exception 'Authentication is required to place an order.' using errcode='42501'; end if;
 if actor_role not in ('CUSTOMER','STAFF','MANAGER','ADMIN') then raise exception 'Account is not authorized to order.'; end if;
 if source='POS' and actor_role not in ('STAFF','MANAGER','ADMIN') then raise exception 'Only restaurant staff can create POS orders.' using errcode='42501'; end if;
 if source='WEB' then store:=public.get_store_status(); if not coalesce((store->>'open')::boolean,false) then raise exception '%',store->>'reason'; end if; end if;
 if source='WEB' then customer:=actor; else customer:=nullif(p_payload->>'customer_id','')::uuid; end if;
 if customer_name='' then select full_name into customer_name from public.profiles where id=coalesce(customer,actor); end if;
 if customer_name='' or customer_phone='' then raise exception 'Customer name and phone are required.'; end if;
 if fulfillment not in ('PICKUP','DELIVERY') then raise exception 'Invalid fulfillment type.'; end if;
 if fulfillment='PICKUP' and not public.setting_boolean('pickup_enabled',true) then raise exception 'Pickup is currently disabled.'; end if;
 if fulfillment='DELIVERY' and not public.setting_boolean('delivery_enabled',true) then raise exception 'Delivery is currently disabled.'; end if;
 select * into method from public.payment_methods where code=payment_code and active;
 if not found then raise exception 'Selected payment method is unavailable.'; end if;
 if payment_code='CASH_PICKUP' and fulfillment<>'PICKUP' then raise exception 'Cash on Pickup can only be used for pickup orders.'; end if;
 if payment_code='CASH_DELIVERY' and fulfillment<>'DELIVERY' then raise exception 'Cash on Delivery can only be used for delivery orders.'; end if;
 if fulfillment='DELIVERY' then
   select * into zone from public.delivery_zones where id=nullif(p_payload->>'delivery_zone_id','')::uuid and active;
   if not found then raise exception 'Select a valid delivery zone.'; end if;
   if p_payload->'delivery_address' is null then raise exception 'Delivery address is required.'; end if;
   delivery_fee:=zone.delivery_fee; estimated:=zone.estimated_minutes;
 else estimated:=public.setting_numeric('estimated_preparation_minutes',20)::int; end if;
 if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items')=0 then raise exception 'Order has no items.'; end if;

 -- First pass: validate authoritative catalog and calculate subtotal.
 for item in select * from jsonb_array_elements(p_payload->'items') loop
   qty:=coalesce((item->>'quantity')::int,0); if qty<1 or qty>99 then raise exception 'Invalid item quantity.'; end if;
   variant_id:=nullif(item->>'variant_id','')::uuid;
   select coalesce(array_agg(value::text::uuid),'{}'::uuid[]) into addon_ids from jsonb_array_elements_text(coalesce(item->'addon_ids','[]'::jsonb));
   select p.*,c.name category_name into product_rec from public.products p join public.categories c on c.id=p.category_id where p.id=(item->>'product_id')::uuid;
   if not found then raise exception 'A selected product no longer exists.'; end if;
   if not coalesce((public.check_product_availability(product_rec.id,variant_id,qty,addon_ids)->>'available')::boolean,false) then raise exception '%',public.check_product_availability(product_rec.id,variant_id,qty,addon_ids)->>'reason'; end if;
   if exists(select 1 from jsonb_array_elements_text(coalesce(item->'removed_ingredients','[]'::jsonb)) r where not exists(select 1 from public.product_ingredients pi join public.ingredients ig on ig.id=pi.ingredient_id where pi.product_id=product_rec.id and pi.removable=true and ig.name=r.value)) then raise exception 'One or more removed ingredients are not customizable.'; end if;
   unit_price:=product_rec.base_price;
   if variant_id is not null then select * into variant_rec from public.product_variants where id=variant_id and product_id=product_rec.id and active; if not found then raise exception 'Invalid product variant.'; end if; unit_price:=unit_price+variant_rec.price_delta; end if;
   addons_total:=0;
   foreach addon_id in array addon_ids loop select a.* into addon_rec from public.addons a join public.product_addons pa on pa.addon_id=a.id where a.id=addon_id and pa.product_id=product_rec.id and a.active; if not found then raise exception 'Invalid add-on.'; end if; addons_total:=addons_total+addon_rec.price; end loop;
   line_total:=(unit_price+addons_total)*qty; subtotal:=subtotal+line_total; n_items:=n_items+qty;
 end loop;

 if fulfillment='DELIVERY' and subtotal<zone.minimum_order then raise exception 'This delivery zone requires a minimum order of %.',zone.minimum_order; end if;
 if fulfillment='DELIVERY' and subtotal<public.setting_numeric('minimum_delivery_order',0) then raise exception 'Minimum delivery order has not been reached.'; end if;

 -- Promotion validation and authoritative discount.
 if nullif(trim(coalesce(p_payload->>'promotion_code','')),'') is not null then
   select * into promo from public.promotions where upper(code)=upper(trim(p_payload->>'promotion_code')) and active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()) for update;
   if not found then raise exception 'Promotion code is invalid or expired.'; end if;
   if subtotal<promo.minimum_spend then raise exception 'Promotion minimum spend is %.',promo.minimum_spend; end if;
   if promo.usage_limit is not null and (select count(*) from public.promotion_usages where promotion_id=promo.id)>=promo.usage_limit then raise exception 'Promotion usage limit has been reached.'; end if;
   if promo.per_user_limit is not null and customer is not null and (select count(*) from public.promotion_usages where promotion_id=promo.id and customer_id=customer)>=promo.per_user_limit then raise exception 'You have already used this promotion the maximum number of times.'; end if;
   if promo.promo_type='PERCENTAGE' then discount:=subtotal*(promo.amount/100.0);
   elsif promo.promo_type in ('FIXED','COMBO') then discount:=least(promo.amount,subtotal);
   elsif promo.promo_type='PRODUCT' then
     select coalesce(sum(((p.base_price+coalesce(v.price_delta,0)) + coalesce((select sum(a.price) from jsonb_array_elements_text(coalesce(x->'addon_ids','[]'::jsonb)) ids join public.addons a on a.id=ids.value::uuid),0)) * (x->>'quantity')::int),0) into eligible
     from jsonb_array_elements(p_payload->'items') x join public.products p on p.id=(x->>'product_id')::uuid left join public.product_variants v on v.id=nullif(x->>'variant_id','')::uuid where exists(select 1 from public.promotion_products pp where pp.promotion_id=promo.id and pp.product_id=p.id);
     discount:=eligible*(promo.amount/100.0);
   elsif promo.promo_type='CATEGORY' then
     select coalesce(sum(((p.base_price+coalesce(v.price_delta,0)) + coalesce((select sum(a.price) from jsonb_array_elements_text(coalesce(x->'addon_ids','[]'::jsonb)) ids join public.addons a on a.id=ids.value::uuid),0)) * (x->>'quantity')::int),0) into eligible
     from jsonb_array_elements(p_payload->'items') x join public.products p on p.id=(x->>'product_id')::uuid left join public.product_variants v on v.id=nullif(x->>'variant_id','')::uuid where exists(select 1 from public.promotion_categories pc where pc.promotion_id=promo.id and pc.category_id=p.category_id);
     discount:=eligible*(promo.amount/100.0);
   end if;
   if promo.maximum_discount is not null then discount:=least(discount,promo.maximum_discount); end if;
   discount:=round(least(discount,subtotal),2);
 end if;
 service_fee:=round(greatest(public.setting_numeric('service_fee',0),0),2);
 tax_rate:=greatest(public.setting_numeric('tax_rate_percent',0),0);
 tax:=round(greatest(subtotal-discount,0)*(tax_rate/100),2);
 total:=round(greatest(subtotal-discount,0)+delivery_fee+service_fee+tax,2);
 if source='POS' and coalesce((p_payload->>'payment_paid')::boolean,false) then initial_payment_status:='PAID'; end if;
 order_no:=public.next_order_number();
 insert into public.orders(order_number,customer_id,source,customer_name,customer_email,customer_phone,fulfillment_type,delivery_zone_id,delivery_address,pickup_notes,subtotal,discount,delivery_fee,service_fee,tax,total,promotion_id,promotion_code,item_count,status,payment_status,estimated_ready_at,idempotency_key,created_by)
 values(order_no,customer,source,customer_name,nullif(customer_email,''),customer_phone,fulfillment,case when fulfillment='DELIVERY' then zone.id else null end,case when fulfillment='DELIVERY' then p_payload->'delivery_address' else null end,p_payload->>'pickup_notes',subtotal,discount,delivery_fee,service_fee,tax,total,promo.id,promo.code,n_items,'PENDING',initial_payment_status,now()+make_interval(mins=>estimated),p_idempotency_key,actor)
 returning * into ord;

 -- Second pass: immutable item/add-on/recipe snapshots.
 for item in select * from jsonb_array_elements(p_payload->'items') loop
   qty:=(item->>'quantity')::int; variant_id:=nullif(item->>'variant_id','')::uuid;
   select coalesce(array_agg(value::text::uuid),'{}'::uuid[]) into addon_ids from jsonb_array_elements_text(coalesce(item->'addon_ids','[]'::jsonb));
   select p.*,c.name category_name into product_rec from public.products p join public.categories c on c.id=p.category_id where p.id=(item->>'product_id')::uuid;
   unit_price:=product_rec.base_price; variant_rec:=null;
   if variant_id is not null then select * into variant_rec from public.product_variants where id=variant_id; unit_price:=unit_price+variant_rec.price_delta; end if;
   addons_total:=coalesce((select sum(a.price) from unnest(addon_ids) x join public.addons a on a.id=x),0);
   line_total:=(unit_price+addons_total)*qty;
   insert into public.order_items(order_id,product_id,variant_id,product_name,category_name,variant_name,unit_price,quantity,line_total,instructions,removed_ingredients)
   values(ord.id,product_rec.id,variant_id,product_rec.name,product_rec.category_name,variant_rec.name,unit_price,qty,line_total,left(coalesce(item->>'instructions',''),500),coalesce(array(select jsonb_array_elements_text(coalesce(item->'removed_ingredients','[]'::jsonb))),'{}'::text[])) returning id into order_item_id;
   foreach addon_id in array addon_ids loop select * into addon_rec from public.addons where id=addon_id; insert into public.order_item_addons(order_item_id,addon_id,addon_name,addon_price) values(order_item_id,addon_id,addon_rec.name,addon_rec.price); end loop;
   insert into public.order_item_ingredients(order_item_id,ingredient_id,quantity_required)
   select order_item_id,pi.ingredient_id,sum(pi.quantity)*qty from public.product_ingredients pi
   where pi.product_id=product_rec.id and ((pi.variant_id is null and pi.addon_id is null) or pi.variant_id=variant_id or pi.addon_id=any(addon_ids)) and not (pi.removable and exists(select 1 from jsonb_array_elements_text(coalesce(item->'removed_ingredients','[]'::jsonb)) r join public.ingredients ig on ig.name=r.value where ig.id=pi.ingredient_id)) group by pi.ingredient_id;
 end loop;
 insert into public.order_status_history(order_id,old_status,new_status,actor_id,reason) values(ord.id,null,'PENDING',actor,'Order created');
 insert into public.payments(order_id,payment_method_id,amount,status) values(ord.id,method.id,total,initial_payment_status);
 if promo.id is not null then insert into public.promotion_usages(promotion_id,order_id,customer_id,discount_amount) values(promo.id,ord.id,customer,discount); end if;
 if customer is not null then
   update public.carts set status='CONVERTED' where customer_id=customer and status='ACTIVE';
   insert into public.notifications(user_id,notification_type,title,body,url) values(customer,'ORDER_RECEIVED','Order received',format('Your order %s has been received.',order_no),'/customer/order-details.html?id='||ord.id);
 end if;
 if public.setting_text('inventory_deduction_stage','CONFIRMED')='PENDING' then perform public._deduct_inventory_for_order(ord.id,actor); end if;
 perform public.log_activity('CREATE','ORDERS','order',ord.id::text,'Order '||order_no||' created',jsonb_build_object('source',source,'total',total),actor);
 return jsonb_build_object('order_id',ord.id,'order_number',order_no,'total',total,'status','PENDING','payment_status',initial_payment_status,'payment_requires_proof',method.requires_proof,'payment_method',method.code);
exception when unique_violation then
 select * into ord from public.orders where idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('order_id',ord.id,'order_number',ord.order_number,'total',ord.total,'status',ord.status,'payment_status',ord.payment_status,'idempotent_replay',true); end if;
 raise;
end $$;

create or replace function public.update_order_status(p_order_id uuid,p_new_status text,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare o public.orders%rowtype; new_status text:=upper(p_new_status); allowed boolean:=false; actor uuid:=auth.uid(); stage text:=public.setting_text('inventory_deduction_stage','CONFIRMED'); begin
 if not public.is_staff() then raise exception 'Staff authorization required.' using errcode='42501'; end if;
 select * into o from public.orders where id=p_order_id for update; if not found then raise exception 'Order not found.'; end if;
 if o.status=new_status then return jsonb_build_object('id',o.id,'status',o.status,'idempotent_replay',true); end if;
 if o.status in ('COMPLETED','CANCELLED') then raise exception 'Finalized orders cannot change status.'; end if;
 allowed:=case o.status when 'PENDING' then new_status in ('CONFIRMED','CANCELLED') when 'CONFIRMED' then new_status in ('PREPARING','CANCELLED') when 'PREPARING' then new_status in ('READY','CANCELLED') when 'READY' then new_status in (case when o.fulfillment_type='DELIVERY' then 'OUT_FOR_DELIVERY' else 'COMPLETED' end,'CANCELLED') when 'OUT_FOR_DELIVERY' then new_status in ('COMPLETED','CANCELLED') else false end;
 if not allowed then raise exception 'Invalid transition from % to %.',o.status,new_status; end if;
 update public.orders set status=new_status,completed_at=case when new_status='COMPLETED' then now() else completed_at end,cancellation_reason=case when new_status='CANCELLED' then nullif(trim(p_reason),'') else cancellation_reason end,cancelled_by=case when new_status='CANCELLED' then actor else cancelled_by end,cancelled_at=case when new_status='CANCELLED' then now() else cancelled_at end where id=o.id;
 insert into public.order_status_history(order_id,old_status,new_status,actor_id,reason) values(o.id,o.status,new_status,actor,nullif(trim(p_reason),''));
 if stage=new_status then perform public._deduct_inventory_for_order(o.id,actor); end if;
 if new_status='CANCELLED' then perform public._restore_inventory_for_order(o.id,actor); update public.payments set status=case when status in ('PENDING','SUBMITTED') then 'CANCELLED' else status end where order_id=o.id; end if;
 if o.customer_id is not null then insert into public.notifications(user_id,notification_type,title,body,url) values(o.customer_id,'ORDER_STATUS','Order '||replace(new_status,'_',' '),format('%s is now %s.',o.order_number,replace(new_status,'_',' ')),'/customer/order-details.html?id='||o.id); end if;
 perform public.log_activity('STATUS_CHANGE','ORDERS','order',o.id::text,format('%s: %s → %s',o.order_number,o.status,new_status),jsonb_build_object('reason',p_reason),actor);
 return jsonb_build_object('id',o.id,'order_number',o.order_number,'status',new_status);
end $$;

create or replace function public.cancel_order(p_order_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare o public.orders%rowtype; actor uuid:=auth.uid(); begin
 if actor is null then raise exception 'Authentication required.'; end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Cancellation reason is required.'; end if;
 select * into o from public.orders where id=p_order_id for update; if not found then raise exception 'Order not found.'; end if;
 if public.is_staff() then return public.update_order_status(p_order_id,'CANCELLED',p_reason); end if;
 if o.customer_id<>actor then raise exception 'You may cancel only your own order.' using errcode='42501'; end if;
 if not public.setting_boolean('customer_cancellation_enabled',true) then raise exception 'Customer cancellation is disabled. Contact the restaurant.'; end if;
 if o.status not in ('PENDING','CONFIRMED') then raise exception 'This order can no longer be cancelled online.'; end if;
 update public.orders set status='CANCELLED',cancellation_reason=p_reason,cancelled_by=actor,cancelled_at=now() where id=o.id;
 insert into public.order_status_history(order_id,old_status,new_status,actor_id,reason) values(o.id,o.status,'CANCELLED',actor,p_reason);
 perform public._restore_inventory_for_order(o.id,actor);
 update public.payments set status=case when status in ('PENDING','SUBMITTED') then 'CANCELLED' else status end where order_id=o.id;
 insert into public.notifications(user_id,notification_type,title,body,url) values(actor,'ORDER_CANCELLED','Order cancelled',o.order_number||' was cancelled.','/customer/order-details.html?id='||o.id);
 perform public.log_activity('CANCEL','ORDERS','order',o.id::text,'Customer cancelled '||o.order_number,jsonb_build_object('reason',p_reason),actor);
 return jsonb_build_object('id',o.id,'status','CANCELLED');
end $$;

create or replace function public.submit_payment_proof(p_payment_id uuid,p_storage_path text,p_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare p public.payments%rowtype; o public.orders%rowtype; actor uuid:=auth.uid(); begin
 select * into p from public.payments where id=p_payment_id for update; if not found then raise exception 'Payment not found.'; end if;
 select * into o from public.orders where id=p.order_id; if o.customer_id<>actor and not public.is_staff() then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p.status not in ('PENDING','REJECTED') then raise exception 'Payment proof cannot be submitted in the current state.'; end if;
 if p_storage_path is null or p_storage_path='' then raise exception 'Payment proof path is required.'; end if;
 update public.payments set proof_path=p_storage_path,reference_number=nullif(trim(p_reference),''),status='SUBMITTED',rejection_reason=null where id=p.id;
 update public.orders set payment_status='SUBMITTED' where id=p.order_id;
 if o.customer_id is not null then insert into public.notifications(user_id,notification_type,title,body,url) values(o.customer_id,'PAYMENT_SUBMITTED','Payment proof submitted','Your payment proof is waiting for verification.','/customer/order-details.html?id='||o.id); end if;
 return jsonb_build_object('payment_id',p.id,'status','SUBMITTED');
end $$;

create or replace function public.verify_payment(p_payment_id uuid,p_decision text,p_reason text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare p public.payments%rowtype; o public.orders%rowtype; decision text:=upper(p_decision); actor uuid:=auth.uid(); begin
 if not public.is_staff() then raise exception 'Staff authorization required.' using errcode='42501'; end if;
 select * into p from public.payments where id=p_payment_id for update; if not found then raise exception 'Payment not found.'; end if;
 select * into o from public.orders where id=p.order_id;
 if decision='VERIFY' then
   if p.status in ('VERIFIED','PAID') then return jsonb_build_object('status',p.status,'idempotent_replay',true); end if;
   if p.status not in ('SUBMITTED','PENDING') then raise exception 'Payment cannot be verified in this state.'; end if;
   update public.payments set status='VERIFIED',verified_by=actor,verified_at=now(),rejection_reason=null where id=p.id; update public.orders set payment_status='VERIFIED' where id=o.id;
   if o.customer_id is not null then insert into public.notifications(user_id,notification_type,title,body,url) values(o.customer_id,'PAYMENT_VERIFIED','Payment verified','Payment for '||o.order_number||' was verified.','/customer/order-details.html?id='||o.id); end if;
   perform public.log_activity('VERIFY','PAYMENTS','payment',p.id::text,'Verified payment for '||o.order_number,jsonb_build_object('idempotency_key',p_idempotency_key),actor);
   return jsonb_build_object('payment_id',p.id,'status','VERIFIED');
 elsif decision='REJECT' then
   if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Rejection reason is required.'; end if;
   if p.status='REJECTED' then return jsonb_build_object('status','REJECTED','idempotent_replay',true); end if;
   update public.payments set status='REJECTED',verified_by=actor,verified_at=now(),rejection_reason=p_reason where id=p.id; update public.orders set payment_status='REJECTED' where id=o.id;
   if o.customer_id is not null then insert into public.notifications(user_id,notification_type,title,body,url) values(o.customer_id,'PAYMENT_REJECTED','Payment needs attention',p_reason,'/customer/order-details.html?id='||o.id); end if;
   perform public.log_activity('REJECT','PAYMENTS','payment',p.id::text,'Rejected payment for '||o.order_number,jsonb_build_object('reason',p_reason,'idempotency_key',p_idempotency_key),actor);
   return jsonb_build_object('payment_id',p.id,'status','REJECTED');
 else raise exception 'Decision must be VERIFY or REJECT.'; end if;
end $$;

create or replace function public.record_refund(p_payment_id uuid,p_amount numeric,p_reason text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare p public.payments%rowtype; r public.refunds%rowtype; refunded numeric; actor uuid:=auth.uid(); begin
 if public.current_role() not in ('MANAGER','ADMIN') then raise exception 'Manager or administrator authorization required.' using errcode='42501'; end if;
 select * into r from public.refunds where idempotency_key=p_idempotency_key; if found then return to_jsonb(r); end if;
 select * into p from public.payments where id=p_payment_id for update; if not found then raise exception 'Payment not found.'; end if;
 if p.status not in ('VERIFIED','PAID','PARTIALLY_REFUNDED') then raise exception 'Only paid/verified payments can be refunded.'; end if;
 select coalesce(sum(amount),0) into refunded from public.refunds where payment_id=p.id and status not in ('FAILED','CANCELLED');
 if p_amount<=0 or refunded+p_amount>p.amount then raise exception 'Refund amount exceeds refundable balance.'; end if;
 insert into public.refunds(payment_id,amount,reason,idempotency_key,processed_by) values(p.id,p_amount,p_reason,p_idempotency_key,actor) returning * into r;
 update public.payments set status=case when refunded+p_amount=p.amount then 'REFUNDED' else 'PARTIALLY_REFUNDED' end where id=p.id;
 update public.orders set payment_status=case when refunded+p_amount=p.amount then 'REFUNDED' else 'PARTIALLY_REFUNDED' end where id=p.order_id;
 perform public.log_activity('REFUND','PAYMENTS','payment',p.id::text,'Refund recorded',jsonb_build_object('amount',p_amount,'reason',p_reason),actor);
 return to_jsonb(r);
end $$;

create or replace function public.adjust_inventory(p_inventory_item_id uuid,p_quantity_delta numeric,p_movement_type text,p_notes text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare inv public.inventory_items%rowtype; m public.inventory_movements%rowtype; new_qty numeric; actor uuid:=auth.uid(); mt text:=upper(p_movement_type); begin
 if not public.is_staff() then raise exception 'Staff authorization required.' using errcode='42501'; end if;
 select * into m from public.inventory_movements where idempotency_key=p_idempotency_key; if found then return to_jsonb(m); end if;
 if mt not in ('MANUAL_ADDITION','ADJUSTMENT','WASTE','SPOILAGE','RETURN','CORRECTION') then raise exception 'Invalid manual movement type.'; end if;
 select * into inv from public.inventory_items where id=p_inventory_item_id for update; if not found then raise exception 'Inventory item not found.'; end if;
 new_qty:=inv.current_quantity+p_quantity_delta; if new_qty<0 then raise exception 'Inventory cannot become negative.'; end if;
 update public.inventory_items set current_quantity=new_qty where id=inv.id;
 insert into public.inventory_movements(inventory_item_id,movement_type,quantity_delta,previous_quantity,new_quantity,reference_type,idempotency_key,actor_id,notes) values(inv.id,mt,p_quantity_delta,inv.current_quantity,new_qty,'MANUAL',p_idempotency_key,actor,p_notes) returning * into m;
 perform public.log_activity('ADJUST','INVENTORY','inventory_item',inv.id::text,'Inventory adjusted',jsonb_build_object('delta',p_quantity_delta,'movement_type',mt),actor);
 return to_jsonb(m);
end $$;

create or replace function public.receive_purchase_order(p_purchase_order_id uuid,p_receipts jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare po public.purchase_orders%rowtype; receipt public.purchase_receipts%rowtype; x jsonb; poi public.purchase_order_items%rowtype; inv public.inventory_items%rowtype; qty numeric; actor uuid:=auth.uid(); remaining int; begin
 if not public.is_staff() then raise exception 'Staff authorization required.' using errcode='42501'; end if;
 select * into receipt from public.purchase_receipts where idempotency_key=p_idempotency_key; if found then return jsonb_build_object('purchase_order_id',p_purchase_order_id,'status',(select status from public.purchase_orders where id=p_purchase_order_id),'idempotent_replay',true); end if;
 select * into po from public.purchase_orders where id=p_purchase_order_id for update; if not found then raise exception 'Purchase order not found.'; end if;
 if po.status not in ('ORDERED','PARTIALLY_RECEIVED') then raise exception 'Purchase order cannot be received in state %.',po.status; end if;
 insert into public.purchase_receipts(purchase_order_id,idempotency_key,received_by) values(po.id,p_idempotency_key,actor) returning * into receipt;
 for x in select * from jsonb_array_elements(p_receipts) loop
   qty:=coalesce((x->>'quantity')::numeric,0); if qty<=0 then raise exception 'Received quantity must be positive.'; end if;
   select * into poi from public.purchase_order_items where id=(x->>'purchase_order_item_id')::uuid and purchase_order_id=po.id for update; if not found then raise exception 'Purchase order item not found.'; end if;
   if poi.received_quantity+qty>poi.requested_quantity then raise exception 'Cannot receive more than requested.'; end if;
   select * into inv from public.inventory_items where id=poi.inventory_item_id for update;
   update public.purchase_order_items set received_quantity=received_quantity+qty where id=poi.id;
   update public.inventory_items set current_quantity=current_quantity+qty,unit_cost=poi.unit_cost where id=inv.id;
   insert into public.inventory_movements(inventory_item_id,movement_type,quantity_delta,previous_quantity,new_quantity,reference_type,reference_id,idempotency_key,actor_id,notes) values(inv.id,'PURCHASE',qty,inv.current_quantity,inv.current_quantity+qty,'PURCHASE_ORDER',po.id,'po:'||receipt.id||':'||poi.id,actor,'Purchase order receipt');
 end loop;
 select count(*) into remaining from public.purchase_order_items where purchase_order_id=po.id and received_quantity<requested_quantity;
 update public.purchase_orders set status=case when remaining=0 then 'RECEIVED' else 'PARTIALLY_RECEIVED' end,received_date=case when remaining=0 then current_date else received_date end where id=po.id;
 perform public.log_activity('RECEIVE','PURCHASING','purchase_order',po.id::text,'Purchase order stock received',jsonb_build_object('receipt_id',receipt.id),actor);
 return jsonb_build_object('purchase_order_id',po.id,'status',case when remaining=0 then 'RECEIVED' else 'PARTIALLY_RECEIVED' end,'receipt_id',receipt.id);
end $$;

create or replace function public.mark_all_notifications_read() returns void language sql security definer set search_path=public,auth as $$ update public.notifications set read_at=now() where user_id=auth.uid() and read_at is null $$;

-- Recalculate product rating after review changes.
create or replace function public.refresh_product_rating() returns trigger language plpgsql security definer set search_path=public as $$
declare pid uuid:=coalesce(new.product_id,old.product_id); begin update public.products p set rating_average=coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.product_id=pid and r.visible),0),rating_count=(select count(*) from public.reviews r where r.product_id=pid and r.visible) where p.id=pid; return coalesce(new,old); end $$;
drop trigger if exists review_refresh_rating on public.reviews;
create trigger review_refresh_rating after insert or update or delete on public.reviews for each row execute function public.refresh_product_rating();
