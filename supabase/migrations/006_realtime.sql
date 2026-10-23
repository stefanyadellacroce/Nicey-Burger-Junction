-- Realtime publication. RLS still applies to clients.
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.order_status_history;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
