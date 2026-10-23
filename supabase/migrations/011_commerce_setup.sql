-- Existing installations may have enabled the sample payment instructions
-- and delivery areas. Disable only untouched sample records.
update public.payment_methods set active=false
where code in ('GCASH','MAYA','BANK')
  and instructions in (
    'Send payment using the merchant details configured by the restaurant, then upload proof and reference.',
    'Transfer to the configured business account, then upload proof and reference.'
  );

update public.payment_methods set active=false
where active and method_type not in ('CASH','EXTERNAL_GATEWAY')
  and (length(trim(coalesce(instructions,'')))<15
       or instructions ~* '(configured by the restaurant|configured business account)');

update public.delivery_zones set active=false
where (name='Central Zone' and areas=array['Central district','Nearby barangays']::text[])
   or (name='Extended Zone' and areas=array['Outer service area']::text[]);

update public.delivery_zones set active=false
where active and (
  coalesce(array_length(areas,1),0)=0 or length(trim(name))=0
  or areas && array['Central district','Nearby barangays','Outer service area']::text[]
);

-- The older checkout may still show the delivery toggle from settings.
-- Pause delivery until an administrator configures a real active zone.
update public.settings set value='{"value":false}'::jsonb
where key='delivery_enabled'
  and not exists(select 1 from public.delivery_zones where active);

-- Admins manage these through the browser; RLS still restricts all writes.
grant insert,update,delete on public.delivery_zones to authenticated;

alter table public.payment_methods add constraint payment_instructions_when_active
check (
  not active or method_type in ('CASH','EXTERNAL_GATEWAY') or
  (length(trim(coalesce(instructions,'')))>=15 and
   instructions !~* '(configured by the restaurant|configured business account)')
);

alter table public.delivery_zones add constraint active_delivery_zone_has_area
check (not active or (
  coalesce(array_length(areas,1),0)>0 and length(trim(name))>0
  and not (areas && array['Central district','Nearby barangays','Outer service area']::text[])
));
