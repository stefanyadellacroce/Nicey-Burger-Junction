-- Row Level Security. Frontend visibility is not authorization; these policies are.

-- Profiles
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (id=auth.uid() or public.is_staff());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());

alter table public.user_addresses enable row level security;
create policy addresses_own_select on public.user_addresses for select using(customer_id=auth.uid() or public.is_staff());
create policy addresses_own_insert on public.user_addresses for insert with check(customer_id=auth.uid());
create policy addresses_own_update on public.user_addresses for update using(customer_id=auth.uid()) with check(customer_id=auth.uid());
create policy addresses_own_delete on public.user_addresses for delete using(customer_id=auth.uid());

alter table public.settings enable row level security;
create policy settings_public_select on public.settings for select using(public_read or public.is_staff());
create policy settings_admin_insert on public.settings for insert with check(public.is_admin());
create policy settings_admin_update on public.settings for update using(public.is_admin()) with check(public.is_admin());
create policy settings_admin_delete on public.settings for delete using(public.is_admin());

-- Catalog public read + admin write.
DO $$ declare t text; begin foreach t in array array['categories','products','product_images','product_variants','addons','product_addons'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy categories_read on public.categories for select using(active or public.is_staff());
create policy categories_admin_insert on public.categories for insert with check(public.is_admin());
create policy categories_admin_update on public.categories for update using(public.is_admin()) with check(public.is_admin());
create policy categories_admin_delete on public.categories for delete using(public.is_admin());
create policy products_read on public.products for select using(active or public.is_staff());
create policy products_admin_insert on public.products for insert with check(public.is_admin());
create policy products_admin_update on public.products for update using(public.is_admin()) with check(public.is_admin());
create policy products_admin_delete on public.products for delete using(public.is_admin());
create policy product_images_read on public.product_images for select using(exists(select 1 from public.products p where p.id=product_id and (p.active or public.is_staff())));
create policy product_images_admin_all on public.product_images for all using(public.is_admin()) with check(public.is_admin());
create policy variants_read on public.product_variants for select using(active or public.is_staff());
create policy variants_admin_all on public.product_variants for all using(public.is_admin()) with check(public.is_admin());
create policy addons_read on public.addons for select using(active or public.is_staff());
create policy addons_admin_all on public.addons for all using(public.is_admin()) with check(public.is_admin());
create policy product_addons_read on public.product_addons for select using(true);
create policy product_addons_admin_all on public.product_addons for all using(public.is_admin()) with check(public.is_admin());

-- Recipes / inventory / suppliers: operational read, sensitive writes through admin/RPC.
DO $$ declare t text; begin foreach t in array array['ingredients','product_ingredients','inventory_items','inventory_movements','suppliers','supplier_items','purchase_orders','purchase_order_items','purchase_receipts'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy ingredients_staff_read on public.ingredients for select using(public.is_staff());
create policy ingredients_admin_all on public.ingredients for all using(public.is_admin()) with check(public.is_admin());
create policy recipes_staff_read on public.product_ingredients for select using(public.is_staff());
create policy recipes_admin_all on public.product_ingredients for all using(public.is_admin()) with check(public.is_admin());
create policy inventory_staff_read on public.inventory_items for select using(public.is_staff());
create policy inventory_admin_insert on public.inventory_items for insert with check(public.is_admin());
create policy inventory_admin_update on public.inventory_items for update using(public.is_admin()) with check(public.is_admin());
create policy movements_staff_read on public.inventory_movements for select using(public.is_staff());
create policy suppliers_staff_read on public.suppliers for select using(public.is_staff());
create policy suppliers_admin_all on public.suppliers for all using(public.is_admin()) with check(public.is_admin());
create policy supplier_items_staff_read on public.supplier_items for select using(public.is_staff());
create policy supplier_items_admin_all on public.supplier_items for all using(public.is_admin()) with check(public.is_admin());
create policy po_staff_read on public.purchase_orders for select using(public.is_staff());
create policy po_manager_insert on public.purchase_orders for insert with check(public.current_role() in ('MANAGER','ADMIN'));
create policy po_manager_update on public.purchase_orders for update using(public.current_role() in ('MANAGER','ADMIN')) with check(public.current_role() in ('MANAGER','ADMIN'));
create policy poi_staff_read on public.purchase_order_items for select using(public.is_staff());
create policy poi_manager_all on public.purchase_order_items for all using(public.current_role() in ('MANAGER','ADMIN')) with check(public.current_role() in ('MANAGER','ADMIN'));
create policy purchase_receipts_staff_read on public.purchase_receipts for select using(public.is_staff());

alter table public.delivery_zones enable row level security;
create policy delivery_zones_read on public.delivery_zones for select using(active or public.is_staff());
create policy delivery_zones_admin_all on public.delivery_zones for all using(public.is_admin()) with check(public.is_admin());

-- Cart is private to customer.
alter table public.carts enable row level security;
create policy carts_own on public.carts for select using(customer_id=auth.uid());
create policy carts_own_insert on public.carts for insert with check(customer_id=auth.uid());
create policy carts_own_update on public.carts for update using(customer_id=auth.uid()) with check(customer_id=auth.uid());
create policy carts_own_delete on public.carts for delete using(customer_id=auth.uid());
alter table public.cart_items enable row level security;
create policy cart_items_own_select on public.cart_items for select using(exists(select 1 from public.carts c where c.id=cart_id and c.customer_id=auth.uid()));
create policy cart_items_own_insert on public.cart_items for insert with check(exists(select 1 from public.carts c where c.id=cart_id and c.customer_id=auth.uid() and c.status='ACTIVE'));
create policy cart_items_own_update on public.cart_items for update using(exists(select 1 from public.carts c where c.id=cart_id and c.customer_id=auth.uid())) with check(exists(select 1 from public.carts c where c.id=cart_id and c.customer_id=auth.uid()));
create policy cart_items_own_delete on public.cart_items for delete using(exists(select 1 from public.carts c where c.id=cart_id and c.customer_id=auth.uid()));
alter table public.cart_item_addons enable row level security;
create policy cart_addons_own_select on public.cart_item_addons for select using(exists(select 1 from public.cart_items ci join public.carts c on c.id=ci.cart_id where ci.id=cart_item_id and c.customer_id=auth.uid()));
create policy cart_addons_own_insert on public.cart_item_addons for insert with check(exists(select 1 from public.cart_items ci join public.carts c on c.id=ci.cart_id where ci.id=cart_item_id and c.customer_id=auth.uid()));
create policy cart_addons_own_delete on public.cart_item_addons for delete using(exists(select 1 from public.cart_items ci join public.carts c on c.id=ci.cart_id where ci.id=cart_item_id and c.customer_id=auth.uid()));

-- Promotions are publicly readable when active; admin writes.
DO $$ declare t text; begin foreach t in array array['promotions','promotion_products','promotion_categories','promotion_usages'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy promotions_read on public.promotions for select using(active or public.is_staff());
create policy promotions_admin_all on public.promotions for all using(public.is_admin()) with check(public.is_admin());
create policy promo_products_read on public.promotion_products for select using(true);
create policy promo_products_admin on public.promotion_products for all using(public.is_admin()) with check(public.is_admin());
create policy promo_categories_read on public.promotion_categories for select using(true);
create policy promo_categories_admin on public.promotion_categories for all using(public.is_admin()) with check(public.is_admin());
create policy promo_usages_own_staff on public.promotion_usages for select using(customer_id=auth.uid() or public.is_staff());

-- Orders and snapshots.
DO $$ declare t text; begin foreach t in array array['orders','order_items','order_item_addons','order_item_ingredients','order_status_history','inventory_order_deductions','daily_order_counters'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy orders_select on public.orders for select using(customer_id=auth.uid() or public.is_staff());
create policy orders_staff_update on public.orders for update using(public.is_staff()) with check(public.is_staff());
create policy order_items_select on public.order_items for select using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or public.is_staff())));
create policy order_addons_select on public.order_item_addons for select using(exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and (o.customer_id=auth.uid() or public.is_staff())));
create policy order_ingredients_staff on public.order_item_ingredients for select using(public.is_staff());
create policy order_history_select on public.order_status_history for select using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or public.is_staff())));
create policy order_deductions_staff on public.inventory_order_deductions for select using(public.is_staff());
-- Daily counters intentionally have no client policy; secure function owns access.

-- Payments/refunds.
DO $$ declare t text; begin foreach t in array array['payment_methods','payments','refunds'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy payment_methods_read on public.payment_methods for select using(active or public.is_staff());
create policy payment_methods_admin on public.payment_methods for all using(public.is_admin()) with check(public.is_admin());
create policy payments_select on public.payments for select using(public.is_staff() or exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy refunds_staff_select on public.refunds for select using(public.current_role() in ('MANAGER','ADMIN'));

-- Favorites/reviews/notifications.
alter table public.favorites enable row level security;
create policy favorites_own_all on public.favorites for all using(customer_id=auth.uid()) with check(customer_id=auth.uid());
alter table public.reviews enable row level security;
create or replace function public.can_review_product(p_product uuid,p_order_item uuid)
returns boolean language sql stable security definer set search_path=public,auth as $$
 select exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=p_order_item and oi.product_id=p_product and o.customer_id=auth.uid() and o.status='COMPLETED');
$$;
create policy reviews_public_read on public.reviews for select using(visible or customer_id=auth.uid() or public.is_staff());
create policy reviews_verified_insert on public.reviews for insert with check(customer_id=auth.uid() and public.can_review_product(product_id,order_item_id));
create policy reviews_own_update on public.reviews for update using(customer_id=auth.uid()) with check(customer_id=auth.uid());
create policy reviews_own_delete on public.reviews for delete using(customer_id=auth.uid());
create policy reviews_admin_update on public.reviews for update using(public.is_admin()) with check(public.is_admin());
alter table public.notifications enable row level security;
create policy notifications_own_select on public.notifications for select using(user_id=auth.uid());
create policy notifications_own_update on public.notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());


-- Contact inquiries: public may submit, only staff can read/manage.
alter table public.contact_messages enable row level security;
create policy contact_public_insert on public.contact_messages for insert to anon,authenticated with check(length(trim(name))>0 and position('@' in email)>1);
create policy contact_staff_read on public.contact_messages for select to authenticated using(public.is_staff());
create policy contact_staff_update on public.contact_messages for update to authenticated using(public.is_staff()) with check(public.is_staff());

-- Finance
DO $$ declare t text; begin foreach t in array array['expense_categories','expenses'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy expense_categories_staff_read on public.expense_categories for select using(public.is_staff());
create policy expense_categories_admin_all on public.expense_categories for all using(public.is_admin()) with check(public.is_admin());
create policy expenses_manager_read on public.expenses for select using(public.current_role() in ('MANAGER','ADMIN'));
create policy expenses_manager_all on public.expenses for all using(public.current_role() in ('MANAGER','ADMIN')) with check(public.current_role() in ('MANAGER','ADMIN'));

alter table public.activity_logs enable row level security;
create policy activity_logs_admin_read on public.activity_logs for select using(public.is_admin());

-- ML: customers can read only recommendations appropriate to them; operational forecasts are admin/manager data.
DO $$ declare t text; begin foreach t in array array['ml_models','ml_training_runs','ml_metrics','demand_forecasts','product_recommendations','recommendation_events','inventory_forecasts'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy ml_models_staff_read on public.ml_models for select using(public.current_role() in ('MANAGER','ADMIN'));
create policy ml_runs_staff_read on public.ml_training_runs for select using(public.current_role() in ('MANAGER','ADMIN'));
create policy ml_metrics_staff_read on public.ml_metrics for select using(public.current_role() in ('MANAGER','ADMIN'));
create policy demand_staff_read on public.demand_forecasts for select using(public.current_role() in ('MANAGER','ADMIN'));
create policy inventory_forecasts_staff_read on public.inventory_forecasts for select using(public.current_role() in ('MANAGER','ADMIN'));
create policy recommendations_read on public.product_recommendations for select using(customer_id is null or customer_id=auth.uid() or public.current_role() in ('MANAGER','ADMIN'));
create policy recommendation_events_own_insert on public.recommendation_events for insert with check(customer_id is null or customer_id=auth.uid());

-- Explicit execute permissions on safe RPCs.
grant execute on function public.current_role() to anon,authenticated;
grant execute on function public.get_store_status() to anon,authenticated;
grant execute on function public.check_product_availability(uuid,uuid,integer,uuid[]) to anon,authenticated;
grant execute on function public.create_order(jsonb,text) to authenticated;
grant execute on function public.update_order_status(uuid,text,text) to authenticated;
grant execute on function public.cancel_order(uuid,text) to authenticated;
grant execute on function public.submit_payment_proof(uuid,text,text) to authenticated;
grant execute on function public.verify_payment(uuid,text,text,text) to authenticated;
grant execute on function public.record_refund(uuid,numeric,text,text) to authenticated;
grant execute on function public.adjust_inventory(uuid,numeric,text,text,text) to authenticated;
grant execute on function public.receive_purchase_order(uuid,jsonb,text) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
