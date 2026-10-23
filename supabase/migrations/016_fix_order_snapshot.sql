-- Allow base products without a variant when writing immutable order snapshots.
-- Close order-source and idempotency authorization gaps.
create or replace function public.create_order(p_payload jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
<<order_ctx>>
declare
 actor uuid:=auth.uid(); actor_role text:=public.current_role(); customer uuid; source text:=upper(coalesce(p_payload->>'source','WEB'));
 fulfillment text:=upper(coalesce(p_payload->>'fulfillment_type','PICKUP')); payment_code text:=upper(coalesce(p_payload->>'payment_method','CASH'));
 customer_name text:=trim(coalesce(p_payload->>'customer_name','')); customer_email text:=lower(trim(coalesce(p_payload->>'customer_email',''))); customer_phone text:=trim(coalesce(p_payload->>'customer_phone',''));
 subtotal numeric:=0; eligible numeric:=0; discount numeric:=0; delivery_fee numeric:=0; service_fee numeric:=0; tax numeric:=0; total numeric:=0; tax_rate numeric:=0;
 item jsonb; product_rec record; variant_rec public.product_variants%rowtype; addon_rec record; qty int; variant_id uuid; addon_ids uuid[]; addon_id uuid; unit_price numeric; addons_total numeric; line_total numeric;
 promo public.promotions%rowtype; zone public.delivery_zones%rowtype; method public.payment_methods%rowtype; ord public.orders%rowtype; order_item_id uuid; order_no text; store jsonb;
 initial_payment_status text:='PENDING'; estimated int:=20; n_items int:=0;
begin
 if actor is null then raise exception 'Authentication is required to place an order.' using errcode='42501'; end if;
 if actor_role not in ('CUSTOMER','STAFF','MANAGER','ADMIN') then raise exception 'Account is not authorized to order.' using errcode='42501'; end if;
 if source not in ('WEB','POS') then raise exception 'Invalid order source.'; end if;
 if source='POS' and actor_role not in ('STAFF','MANAGER','ADMIN') then raise exception 'Only restaurant staff can create POS orders.' using errcode='42501'; end if;
 if p_idempotency_key is null or length(trim(p_idempotency_key))<8 then raise exception 'A valid idempotency key is required.'; end if;
 select * into ord from public.orders where idempotency_key=p_idempotency_key;
 if found then
   if ord.created_by is distinct from actor then raise exception 'This order request belongs to another account.' using errcode='42501'; end if;
   return jsonb_build_object('order_id',ord.id,'order_number',ord.order_number,'total',ord.total,'status',ord.status,'payment_status',ord.payment_status,'idempotent_replay',true);
 end if;
 if source='WEB' then store:=public.get_store_status(); if not coalesce((store->>'open')::boolean,false) then raise exception '%',store->>'reason'; end if; end if;
 if source='WEB' then customer:=actor; else customer:=nullif(p_payload->>'customer_id','')::uuid; end if;
 if customer_name='' then select full_name into customer_name from public.profiles where id=coalesce(customer,actor); end if;
 if customer_name='' or customer_phone='' then raise exception 'Customer name and phone are required.'; end if;
 if fulfillment not in ('PICKUP','DELIVERY') then raise exception 'Invalid fulfillment type.'; end if;
 if fulfillment='PICKUP' and not public.setting_boolean('pickup_enabled',false) then raise exception 'Pickup is currently disabled.'; end if;
 if fulfillment='DELIVERY' and not public.setting_boolean('delivery_enabled',false) then raise exception 'Delivery is currently disabled.'; end if;
 select * into method from public.payment_methods where code=payment_code and active;
 if not found then raise exception 'Selected payment method is unavailable.'; end if;
 if payment_code='CASH_PICKUP' and fulfillment<>'PICKUP' then raise exception 'Cash on Pickup can only be used for pickup orders.'; end if;
 if payment_code='CASH_DELIVERY' and fulfillment<>'DELIVERY' then raise exception 'Cash on Delivery can only be used for delivery orders.'; end if;
 if fulfillment='DELIVERY' then
   select * into zone from public.delivery_zones where id=nullif(p_payload->>'delivery_zone_id','')::uuid and active;
   if not found then raise exception 'Select a valid delivery zone.'; end if;
   if p_payload->'delivery_address' is null then raise exception 'Delivery address is required.'; end if;
   delivery_fee:=zone.delivery_fee; estimated:=zone.estimated_minutes;
 else estimated:=public.setting_numeric('estimated_preparation_minutes',0)::int;
   if estimated<1 then raise exception 'Pickup preparation time is not configured.'; end if;
 end if;
 if jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items')=0 then raise exception 'Order has no items.'; end if;

 -- First pass: validate authoritative catalog and calculate subtotal.
 for item in select * from jsonb_array_elements(p_payload->'items') loop
   qty:=coalesce((item->>'quantity')::int,0); if qty<1 or qty>99 then raise exception 'Invalid item quantity.'; end if;
   variant_id:=nullif(item->>'variant_id','')::uuid;
   select coalesce(array_agg(value::text::uuid),'{}'::uuid[]) into addon_ids from jsonb_array_elements_text(coalesce(item->'addon_ids','[]'::jsonb));
   select p.*,c.name category_name into product_rec from public.products p join public.categories c on c.id=p.category_id where p.id=(item->>'product_id')::uuid and c.active;
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
   select p.*,c.name category_name into product_rec from public.products p join public.categories c on c.id=p.category_id where p.id=(item->>'product_id')::uuid and c.active;
   unit_price:=product_rec.base_price; variant_rec:=null;
   if variant_id is not null then select * into variant_rec from public.product_variants where id=variant_id; unit_price:=unit_price+variant_rec.price_delta; end if;
   addons_total:=coalesce((select sum(a.price) from unnest(addon_ids) x join public.addons a on a.id=x),0);
   line_total:=(unit_price+addons_total)*qty;
   insert into public.order_items(order_id,product_id,variant_id,product_name,category_name,variant_name,unit_price,quantity,line_total,instructions,removed_ingredients)
   values(ord.id,product_rec.id,variant_id,product_rec.name,product_rec.category_name,variant_rec.name,unit_price,qty,line_total,left(coalesce(item->>'instructions',''),500),coalesce(array(select jsonb_array_elements_text(coalesce(item->'removed_ingredients','[]'::jsonb))),'{}'::text[])) returning id into order_item_id;
   foreach addon_id in array addon_ids loop select * into addon_rec from public.addons where id=addon_id; insert into public.order_item_addons(order_item_id,addon_id,addon_name,addon_price) values(order_item_id,addon_id,addon_rec.name,addon_rec.price); end loop;
   insert into public.order_item_ingredients(order_item_id,ingredient_id,quantity_required)
   select order_item_id,pi.ingredient_id,sum(pi.quantity)*qty from public.product_ingredients pi
   where pi.product_id=product_rec.id and ((pi.variant_id is null and pi.addon_id is null) or pi.variant_id=order_ctx.variant_id or pi.addon_id=any(addon_ids)) and not (pi.removable and exists(select 1 from jsonb_array_elements_text(coalesce(item->'removed_ingredients','[]'::jsonb)) r join public.ingredients ig on ig.name=r.value where ig.id=pi.ingredient_id)) group by pi.ingredient_id;
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
 if found then
   if ord.created_by is distinct from actor then raise exception 'This order request belongs to another account.' using errcode='42501'; end if;
   return jsonb_build_object('order_id',ord.id,'order_number',ord.order_number,'total',ord.total,'status',ord.status,'payment_status',ord.payment_status,'idempotent_replay',true);
 end if;
 raise;
end $$;

