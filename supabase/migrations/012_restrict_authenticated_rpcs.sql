-- PostgreSQL's default PUBLIC grant can make authenticated-only RPCs callable
-- by anon even when authenticated has an explicit GRANT. Keep only the catalog
-- and store-status helpers anonymous. Application role checks remain in place.
revoke execute on function public.can_review_product(uuid,uuid) from public, anon;
revoke execute on function public.create_order(jsonb,text) from public, anon;
revoke execute on function public.update_order_status(uuid,text,text) from public, anon;
revoke execute on function public.cancel_order(uuid,text) from public, anon;
revoke execute on function public.submit_payment_proof(uuid,text,text) from public, anon;
revoke execute on function public.verify_payment(uuid,text,text,text) from public, anon;
revoke execute on function public.record_refund(uuid,numeric,text,text) from public, anon;
revoke execute on function public.adjust_inventory(uuid,numeric,text,text,text) from public, anon;
revoke execute on function public.receive_purchase_order(uuid,jsonb,text) from public, anon;
revoke execute on function public.mark_all_notifications_read() from public, anon;
revoke execute on function public.dashboard_kpis() from public, anon;
revoke execute on function public.sales_report(timestamptz,timestamptz) from public, anon;
revoke execute on function public.product_performance_report(timestamptz,timestamptz) from public, anon;
revoke execute on function public.category_performance_report(timestamptz,timestamptz) from public, anon;
revoke execute on function public.order_volume_report(timestamptz,timestamptz) from public, anon;
revoke execute on function public.record_cash_payment(uuid,text) from public, anon;

-- These are trigger functions, not browser RPCs.
revoke execute on function public.audit_row_change() from public, anon, authenticated;
revoke execute on function public.protect_profile_trusted_fields() from public, anon, authenticated;
revoke execute on function public.refresh_product_rating() from public, anon, authenticated;
revoke execute on function public.single_default_address() from public, anon, authenticated;
revoke execute on function public.sync_ingredient_inventory_status() from public, anon, authenticated;

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
