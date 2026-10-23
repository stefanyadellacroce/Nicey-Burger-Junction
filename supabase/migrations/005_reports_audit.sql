-- Database-backed analytics and audit helpers.
create or replace function public.dashboard_kpis()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare r jsonb; begin
 if not public.is_staff() then raise exception 'Staff authorization required.' using errcode='42501'; end if;
 select jsonb_build_object(
   'today_sales',coalesce(sum(total) filter(where status='COMPLETED' and created_at>=current_date),0),
   'today_orders',count(*) filter(where created_at>=current_date),
   'pending_orders',count(*) filter(where status='PENDING'),
   'preparing_orders',count(*) filter(where status='PREPARING'),
   'completed_orders',count(*) filter(where status='COMPLETED' and created_at>=current_date),
   'average_order_value',coalesce(avg(total) filter(where status='COMPLETED' and created_at>=current_date),0),
   'low_stock',(select count(*) from public.inventory_items where active and current_quantity<=reorder_level and current_quantity>0),
   'out_of_stock',(select count(*) from public.inventory_items where active and current_quantity<=0),
   'pending_payment_verifications',(select count(*) from public.payments where status='SUBMITTED')
 ) into r from public.orders;
 return r;
end $$;

create or replace function public.sales_report(p_start timestamptz,p_end timestamptz)
returns table(day date,orders bigint,completed_orders bigint,gross_sales numeric,discounts numeric,delivery_fees numeric,net_sales numeric,average_order_value numeric)
language plpgsql stable security definer set search_path=public,auth as $$
begin
 if public.current_role() not in ('MANAGER','ADMIN') then raise exception 'Manager or administrator authorization required.' using errcode='42501'; end if;
 return query select o.created_at::date,count(*),count(*) filter(where o.status='COMPLETED'),coalesce(sum(o.subtotal) filter(where o.status='COMPLETED'),0),coalesce(sum(o.discount) filter(where o.status='COMPLETED'),0),coalesce(sum(o.delivery_fee) filter(where o.status='COMPLETED'),0),coalesce(sum(o.total) filter(where o.status='COMPLETED'),0),coalesce(avg(o.total) filter(where o.status='COMPLETED'),0) from public.orders o where o.created_at>=p_start and o.created_at<p_end group by o.created_at::date order by 1;
end $$;

create or replace function public.product_performance_report(p_start timestamptz,p_end timestamptz)
returns table(product_name text,quantity_sold bigint,revenue numeric,orders bigint)
language plpgsql stable security definer set search_path=public,auth as $$
begin
 if public.current_role() not in ('MANAGER','ADMIN') then raise exception 'Manager or administrator authorization required.' using errcode='42501'; end if;
 return query select oi.product_name,sum(oi.quantity)::bigint,sum(oi.line_total),count(distinct oi.order_id) from public.order_items oi join public.orders o on o.id=oi.order_id where o.status='COMPLETED' and o.created_at>=p_start and o.created_at<p_end group by oi.product_name order by sum(oi.quantity) desc;
end $$;

create or replace function public.category_performance_report(p_start timestamptz,p_end timestamptz)
returns table(category_name text,quantity_sold bigint,revenue numeric)
language plpgsql stable security definer set search_path=public,auth as $$
begin
 if public.current_role() not in ('MANAGER','ADMIN') then raise exception 'Manager or administrator authorization required.' using errcode='42501'; end if;
 return query select coalesce(oi.category_name,'Uncategorized'),sum(oi.quantity)::bigint,sum(oi.line_total) from public.order_items oi join public.orders o on o.id=oi.order_id where o.status='COMPLETED' and o.created_at>=p_start and o.created_at<p_end group by oi.category_name order by sum(oi.line_total) desc;
end $$;

create or replace function public.order_volume_report(p_start timestamptz,p_end timestamptz)
returns table(hour_of_day integer,orders bigint)
language plpgsql stable security definer set search_path=public,auth as $$
begin
 if not public.is_staff() then raise exception 'Staff authorization required.'; end if;
 return query select extract(hour from created_at)::int,count(*) from public.orders where created_at>=p_start and created_at<p_end group by 1 order by 1;
end $$;

-- Generic audit trigger records event metadata without copying secrets or entire rows.
create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare rid text; detail text; begin
 rid:=coalesce((to_jsonb(new)->>'id'),(to_jsonb(old)->>'id'),(to_jsonb(new)->>'key'),(to_jsonb(old)->>'key'),'');
 detail:=format('%s %s',tg_op,tg_table_name);
 if tg_table_name='products' and tg_op='UPDATE' and new.base_price is distinct from old.base_price then detail:=format('Product price changed from %s to %s',old.base_price,new.base_price); end if;
 insert into public.activity_logs(actor_id,action,module,record_type,record_id,description,metadata) values(auth.uid(),tg_op,upper(tg_table_name),tg_table_name,rid,detail,jsonb_build_object('operation',tg_op));
 return coalesce(new,old);
end $$;
DO $$ declare t text; begin
 foreach t in array array['products','categories','addons','ingredients','suppliers','promotions','expenses','settings'] loop
   execute format('drop trigger if exists %I_audit on public.%I',t,t);
   execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.audit_row_change()',t,t);
 end loop;
end $$;

grant execute on function public.dashboard_kpis() to authenticated;
grant execute on function public.sales_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.product_performance_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.category_performance_report(timestamptz,timestamptz) to authenticated;
grant execute on function public.order_volume_report(timestamptz,timestamptz) to authenticated;
