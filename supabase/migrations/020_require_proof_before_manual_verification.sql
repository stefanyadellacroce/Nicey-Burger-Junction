create or replace function public.require_manual_payment_proof()
returns trigger
language plpgsql
set search_path = public, auth
as $$
declare
  method_requires_proof boolean;
begin
  if new.status in ('VERIFIED', 'REJECTED')
     and old.status in ('PENDING', 'SUBMITTED') then
    select requires_proof
      into method_requires_proof
      from public.payment_methods
     where id = new.payment_method_id;

    if method_requires_proof
       and (old.status <> 'SUBMITTED' or nullif(trim(old.proof_path), '') is null) then
      raise exception 'Payment proof must be submitted before this payment can be reviewed.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_require_manual_proof on public.payments;
create trigger payments_require_manual_proof
before update of status on public.payments
for each row
execute function public.require_manual_payment_proof();
