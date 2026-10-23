-- Require an administrator to confirm actual business details before taking web orders.
insert into public.settings(key,value,public_read,description)
values('ordering_setup_confirmed','{"value":false}'::jsonb,false,
       'Admin confirmed the real contact details and ordering schedule')
on conflict(key) do nothing;

-- Untouched development promotions should not grant live discounts.
update public.promotions p set active=false
where p.active and (
  (p.id='a0000000-0000-4000-8000-000000000001'::uuid and p.code='NICEY10'
   and p.title='Nicey 10% Off' and p.promo_type='PERCENTAGE' and p.amount=10 and p.minimum_spend=300
   and p.maximum_discount=100 and p.usage_limit=500 and p.per_user_limit=3 and not p.automatic)
  or
  (p.id='a0000000-0000-4000-8000-000000000002'::uuid and p.code='JUNCTION50'
   and p.title=('Junction ' || chr(8369) || '50 Off') and p.promo_type='FIXED' and p.amount=50 and p.minimum_spend=500
   and p.maximum_discount=50 and p.usage_limit=300 and p.per_user_limit=2 and not p.automatic)
) and not exists(select 1 from public.promotion_usages u where u.promotion_id=p.id);

create or replace function public.get_store_status()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  tz text:=public.setting_text('timezone',null);
  now_local timestamp;
  schedule jsonb:=public.setting_json('business_hours','{}'::jsonb);
  day jsonb;
  open_t time;
  close_t time;
begin
  if not public.setting_boolean('ordering_enabled',false) then
    return jsonb_build_object('open',false,'reason','Online ordering is temporarily disabled.');
  end if;
  if not public.setting_boolean('ordering_setup_confirmed',false) then
    return jsonb_build_object('open',false,'reason','Store ordering details must be confirmed by an administrator.');
  end if;
  if length(trim(coalesce(public.setting_text('business_phone',''),'')))=0
     or length(trim(coalesce(public.setting_text('business_address',''),'')))=0 then
    return jsonb_build_object('open',false,'reason','Store contact details are not configured.');
  end if;
  if public.setting_boolean('temporary_store_closure',false) then
    return jsonb_build_object('open',false,'reason',coalesce(public.setting_text('store_announcement','Store temporarily closed.'),'Store temporarily closed.'));
  end if;
  if not public.setting_boolean('pickup_enabled',false)
     and not (public.setting_boolean('delivery_enabled',false)
              and exists(select 1 from public.delivery_zones where active)) then
    return jsonb_build_object('open',false,'reason','No fulfillment option is configured.');
  end if;
  if tz is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then
    return jsonb_build_object('open',false,'reason','Store timezone is not configured.');
  end if;
  now_local:=now() at time zone tz;
  if jsonb_typeof(schedule)<>'object' then
    return jsonb_build_object('open',false,'reason','Store ordering hours are not configured.');
  end if;
  day:=schedule->(extract(dow from now_local)::int)::text;
  if day is null or jsonb_typeof(day)<>'object' then
    return jsonb_build_object('open',false,'reason','Store ordering hours are not configured for today.');
  end if;
  if day->>'closed' is distinct from 'false' then
    return jsonb_build_object('open',false,'reason','The restaurant is closed today.');
  end if;
  if coalesce(day->>'open','') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
     or coalesce(day->>'close','') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' then
    return jsonb_build_object('open',false,'reason','Store ordering hours are invalid.');
  end if;
  open_t:=(day->>'open')::time;
  close_t:=(day->>'close')::time;
  if open_t>=close_t then
    return jsonb_build_object('open',false,'reason','Store ordering hours are invalid.');
  end if;
  if now_local::time < open_t or now_local::time >= close_t then
    return jsonb_build_object('open',false,'reason',format('Ordering hours today are %s to %s.',to_char(open_t,'HH12:MI AM'),to_char(close_t,'HH12:MI AM')));
  end if;
  return jsonb_build_object('open',true,'reason','Ordering is open.','local_time',now_local);
end $$;

