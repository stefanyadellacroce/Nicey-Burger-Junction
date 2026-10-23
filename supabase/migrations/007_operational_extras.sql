-- Additional operational RPCs kept separate for straightforward upgrades.
create or replace function public.record_cash_payment(p_payment_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare p public.payments%rowtype; m public.payment_methods%rowtype; o public.orders%rowtype; actor uuid:=auth.uid(); begin
 if not public.is_staff() then raise exception 'Staff authorization required.' using errcode='42501'; end if;
 select * into p from public.payments where id=p_payment_id for update; if not found then raise exception 'Payment not found.'; end if;
 select * into m from public.payment_methods where id=p.payment_method_id;
 select * into o from public.orders where id=p.order_id;
 if m.method_type<>'CASH' then raise exception 'Only cash payments can be recorded with this action.'; end if;
 if p.status='PAID' then return jsonb_build_object('payment_id',p.id,'status','PAID','idempotent_replay',true); end if;
 if p.status not in ('PENDING','VERIFIED') then raise exception 'Payment cannot be marked paid in the current state.'; end if;
 update public.payments set status='PAID',verified_by=actor,verified_at=now(),notes=concat_ws(E'\n',notes,'Cash payment recorded; idempotency '||p_idempotency_key) where id=p.id;
 update public.orders set payment_status='PAID' where id=o.id;
 if o.customer_id is not null then insert into public.notifications(user_id,notification_type,title,body,url) values(o.customer_id,'PAYMENT_PAID','Payment received','Payment for '||o.order_number||' was recorded as paid.','/customer/order-details.html?id='||o.id); end if;
 perform public.log_activity('RECORD_CASH','PAYMENTS','payment',p.id::text,'Cash payment recorded for '||o.order_number,jsonb_build_object('idempotency_key',p_idempotency_key),actor);
 return jsonb_build_object('payment_id',p.id,'status','PAID');
end $$;
grant execute on function public.record_cash_payment(uuid,text) to authenticated;
