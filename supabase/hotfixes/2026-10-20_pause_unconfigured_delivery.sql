-- Align the older checkout with the now-inactive example zones. Re-enable in
-- Website Settings after a real zone is configured and activated.
update public.settings set value='{"value":false}'::jsonb
where key='delivery_enabled'
  and not exists(select 1 from public.delivery_zones where active);
