-- Restore Data API privileges in an existing Nicey database.
-- Idempotent: GRANT adds missing privileges without dropping tables, rows,
-- policies, or existing role grants. RLS still controls visible rows.
-- Can be run on its own after migrations 001-008 when the live project has
-- tables and policies but browser roles lack table privileges.

-- Public catalog/settings reads and contact/recommendation event writes.
grant select on public.categories, public.products, public.product_images, public.product_variants, public.addons, public.product_addons, public.promotions, public.promotion_products, public.promotion_categories, public.delivery_zones, public.payment_methods, public.reviews, public.settings, public.product_recommendations to anon;
grant insert on public.contact_messages, public.recommendation_events to anon;

-- Authenticated website users. RLS narrows each operation by ownership/role.
grant select,insert,update,delete on public.profiles, public.user_addresses, public.carts, public.cart_items, public.cart_item_addons, public.favorites, public.reviews to authenticated;
grant select,update on public.notifications to authenticated;
grant insert on public.recommendation_events, public.contact_messages to authenticated;
grant select on public.categories, public.products, public.product_images, public.product_variants, public.addons, public.product_addons, public.promotions, public.promotion_products, public.promotion_categories, public.promotion_usages, public.delivery_zones, public.payment_methods, public.orders, public.order_items, public.order_item_addons, public.order_item_ingredients, public.order_status_history, public.payments, public.refunds, public.settings, public.ingredients, public.product_ingredients, public.inventory_items, public.inventory_movements, public.suppliers, public.supplier_items, public.purchase_orders, public.purchase_order_items, public.purchase_receipts, public.expense_categories, public.expenses, public.activity_logs, public.ml_models, public.ml_training_runs, public.ml_metrics, public.demand_forecasts, public.product_recommendations, public.inventory_forecasts, public.contact_messages to authenticated;

-- Portal CRUD paths are still constrained by RLS policies to staff/admin roles.
grant insert,update,delete on public.categories, public.products, public.product_images, public.product_variants, public.addons, public.product_addons, public.ingredients, public.product_ingredients, public.inventory_items, public.suppliers, public.supplier_items, public.purchase_orders, public.purchase_order_items, public.payment_methods, public.promotions, public.promotion_products, public.promotion_categories, public.expense_categories, public.expenses, public.settings to authenticated;
grant update on public.orders, public.contact_messages to authenticated;

-- Functions explicitly exposed to browser roles.
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
grant execute on function public.dashboard_kpis() to authenticated;
grant execute on function public.sales_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.product_performance_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.category_performance_report(timestamptz,timestamptz) to authenticated;
