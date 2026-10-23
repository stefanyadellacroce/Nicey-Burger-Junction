-- Targeted live permission fix. Safe to run more than once.
-- The public-facing RPCs keep their existing grants.
begin;
revoke execute on function public.setting_json(text,jsonb) from public, anon, authenticated;
revoke execute on function public.setting_text(text,text) from public, anon, authenticated;
revoke execute on function public.setting_numeric(text,numeric) from public, anon, authenticated;
revoke execute on function public.setting_boolean(text,boolean) from public, anon, authenticated;
revoke execute on function public.log_activity(text,text,text,text,text,jsonb,uuid) from public, anon, authenticated;
revoke execute on function public.next_order_number() from public, anon, authenticated;
commit;
