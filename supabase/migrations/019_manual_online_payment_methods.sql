-- Ensure manual e-wallet options exist on installations created before these
-- methods were included in the seed. They stay inactive until an admin enters
-- real recipient details and enables them in Payment & Delivery Setup.
insert into public.payment_methods(
  code,
  name,
  method_type,
  instructions,
  requires_proof,
  active,
  sort_order
) values
  (
    'GCASH',
    'GCash',
    'MANUAL_DIGITAL',
    'Send payment using the merchant details configured by the restaurant, then upload proof and reference.',
    true,
    false,
    30
  ),
  (
    'MAYA',
    'Maya',
    'MANUAL_DIGITAL',
    'Send payment using the merchant details configured by the restaurant, then upload proof and reference.',
    true,
    false,
    40
  )
on conflict (code) do nothing;
