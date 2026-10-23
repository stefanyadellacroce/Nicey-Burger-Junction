-- Nicey Burger Junction: normalized production schema
-- Run migrations in filename order in the Supabase SQL editor or CLI.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_path text,
  role text not null default 'CUSTOMER' check (role in ('CUSTOMER','STAFF','MANAGER','ADMIN')),
  active boolean not null default true,
  notification_preferences jsonb not null default '{"order":true,"promotions":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  barangay text,
  city text not null,
  province text,
  postal_code text,
  delivery_zone_id uuid,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  public_read boolean not null default false,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_path text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null,
  slug text not null unique,
  short_description text,
  description text not null default '',
  base_price numeric(12,2) not null check (base_price >= 0),
  allergen_notes text,
  active boolean not null default true,
  manually_sold_out boolean not null default false,
  featured boolean not null default false,
  bestseller boolean not null default false,
  track_recipe_availability boolean not null default true,
  availability_schedule jsonb,
  sort_order integer not null default 0,
  rating_average numeric(3,2) not null default 0 check (rating_average between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  price_delta numeric(12,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,name)
);

create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(12,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_addons (
  product_id uuid not null references public.products(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete cascade,
  sort_order integer not null default 0,
  primary key(product_id,addon_id)
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  unit text not null check (unit in ('pc','g','kg','ml','l','slice','pack','serving')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null unique references public.ingredients(id),
  sku text not null unique,
  current_quantity numeric(14,3) not null default 0 check (current_quantity >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  preferred_stock numeric(14,3) not null default 0 check (preferred_stock >= 0),
  unit_cost numeric(12,4) not null default 0 check (unit_cost >= 0),
  supplier_id uuid references public.suppliers(id),
  expiration_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  addon_id uuid references public.addons(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  quantity numeric(14,3) not null check (quantity > 0),
  removable boolean not null default false,
  created_at timestamptz not null default now(),
  unique nulls not distinct(product_id,variant_id,addon_id,ingredient_id)
);

create table if not exists public.supplier_items (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  supplier_sku text,
  last_cost numeric(12,4) check(last_cost >= 0),
  lead_time_days integer check(lead_time_days >= 0),
  primary key(supplier_id,inventory_item_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id),
  movement_type text not null check (movement_type in ('PURCHASE','SALE_USAGE','MANUAL_ADDITION','ADJUSTMENT','WASTE','SPOILAGE','RETURN','CORRECTION','SALE_REVERSAL')),
  quantity_delta numeric(14,3) not null check(quantity_delta <> 0),
  previous_quantity numeric(14,3) not null,
  new_quantity numeric(14,3) not null,
  reference_type text,
  reference_id uuid,
  idempotency_key text,
  actor_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists inventory_movement_idem_unique on public.inventory_movements(idempotency_key) where idempotency_key is not null;

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  areas text[] not null default '{}',
  delivery_fee numeric(12,2) not null default 0 check(delivery_fee >= 0),
  minimum_order numeric(12,2) not null default 0 check(minimum_order >= 0),
  estimated_minutes integer not null default 45 check(estimated_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_addresses drop constraint if exists user_addresses_delivery_zone_id_fkey;
alter table public.user_addresses add constraint user_addresses_delivery_zone_id_fkey foreign key(delivery_zone_id) references public.delivery_zones(id);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'ACTIVE' check(status in ('ACTIVE','CONVERTED','ABANDONED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists carts_one_active_per_customer on public.carts(customer_id) where status='ACTIVE';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  quantity integer not null check(quantity between 1 and 99),
  instructions text check(length(instructions)<=500),
  removed_ingredients text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_item_addons (
  cart_item_id uuid not null references public.cart_items(id) on delete cascade,
  addon_id uuid not null references public.addons(id),
  primary key(cart_item_id,addon_id)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title text not null,
  description text,
  promo_type text not null check(promo_type in ('PERCENTAGE','FIXED','PRODUCT','CATEGORY','COMBO')),
  amount numeric(12,2) not null check(amount >= 0),
  minimum_spend numeric(12,2) not null default 0 check(minimum_spend >= 0),
  maximum_discount numeric(12,2) check(maximum_discount >= 0),
  usage_limit integer check(usage_limit is null or usage_limit > 0),
  per_user_limit integer check(per_user_limit is null or per_user_limit > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  automatic boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key(promotion_id,product_id)
);
create table if not exists public.promotion_categories (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key(promotion_id,category_id)
);

create table if not exists public.daily_order_counters (
  order_date date primary key,
  counter integer not null check(counter > 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.profiles(id),
  source text not null default 'WEB' check(source in ('WEB','POS')),
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  fulfillment_type text not null check(fulfillment_type in ('PICKUP','DELIVERY')),
  delivery_zone_id uuid references public.delivery_zones(id),
  delivery_address jsonb,
  pickup_notes text,
  subtotal numeric(12,2) not null check(subtotal >= 0),
  discount numeric(12,2) not null default 0 check(discount >= 0),
  delivery_fee numeric(12,2) not null default 0 check(delivery_fee >= 0),
  service_fee numeric(12,2) not null default 0 check(service_fee >= 0),
  tax numeric(12,2) not null default 0 check(tax >= 0),
  total numeric(12,2) not null check(total >= 0),
  promotion_id uuid references public.promotions(id),
  promotion_code text,
  item_count integer not null default 0 check(item_count >= 0),
  status text not null default 'PENDING' check(status in ('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','COMPLETED','CANCELLED')),
  payment_status text not null default 'PENDING' check(payment_status in ('PENDING','SUBMITTED','VERIFIED','PAID','FAILED','REJECTED','REFUNDED','PARTIALLY_REFUNDED','CANCELLED')),
  cancellation_reason text,
  cancelled_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  estimated_ready_at timestamptz,
  completed_at timestamptz,
  idempotency_key text not null unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  variant_id uuid references public.product_variants(id),
  product_name text not null,
  category_name text,
  variant_name text,
  unit_price numeric(12,2) not null check(unit_price >= 0),
  quantity integer not null check(quantity between 1 and 999),
  line_discount numeric(12,2) not null default 0 check(line_discount >= 0),
  line_total numeric(12,2) not null check(line_total >= 0),
  instructions text,
  removed_ingredients text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  addon_id uuid references public.addons(id),
  addon_name text not null,
  addon_price numeric(12,2) not null check(addon_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_item_ingredients (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  quantity_required numeric(14,3) not null check(quantity_required > 0),
  created_at timestamptz not null default now(),
  unique(order_item_id,ingredient_id)
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  actor_id uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_order_deductions (
  order_id uuid primary key references public.orders(id) on delete cascade,
  deducted_at timestamptz not null default now(),
  deducted_by uuid references public.profiles(id),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id)
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  method_type text not null check(method_type in ('CASH','MANUAL_DIGITAL','BANK_TRANSFER','EXTERNAL_GATEWAY')),
  instructions text,
  requires_proof boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  payment_method_id uuid not null references public.payment_methods(id),
  amount numeric(12,2) not null check(amount >= 0),
  reference_number text,
  proof_path text,
  status text not null default 'PENDING' check(status in ('PENDING','SUBMITTED','VERIFIED','PAID','FAILED','REJECTED','REFUNDED','PARTIALLY_REFUNDED','CANCELLED')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  amount numeric(12,2) not null check(amount > 0),
  reason text not null,
  status text not null default 'RECORDED' check(status in ('RECORDED','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  idempotency_key text not null unique,
  processed_by uuid not null references public.profiles(id),
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.promotion_usages (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id),
  order_id uuid not null unique references public.orders(id),
  customer_id uuid references public.profiles(id),
  discount_amount numeric(12,2) not null check(discount_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  customer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(customer_id,product_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles(id),
  product_id uuid not null references public.products(id),
  order_item_id uuid references public.order_items(id),
  rating integer not null check(rating between 1 and 5),
  review_text text check(length(review_text)<=1500),
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id,product_id,order_item_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references public.suppliers(id),
  status text not null default 'DRAFT' check(status in ('DRAFT','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED')),
  ordered_date date,
  expected_date date,
  received_date date,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  requested_quantity numeric(14,3) not null check(requested_quantity > 0),
  received_quantity numeric(14,3) not null default 0 check(received_quantity >= 0),
  unit_cost numeric(12,4) not null check(unit_cost >= 0),
  unique(purchase_order_id,inventory_item_id),
  check(received_quantity <= requested_quantity)
);

create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id),
  idempotency_key text not null unique,
  received_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.expense_categories(id),
  description text not null,
  amount numeric(12,2) not null check(amount > 0),
  expense_date date not null default current_date,
  payment_method text,
  reference text,
  notes text,
  recorded_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null check(length(message) between 5 and 5000),
  status text not null default 'NEW' check(status in ('NEW','READ','RESOLVED','SPAM')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);

create table if not exists public.activity_logs (
  id bigint generated by default as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  module text not null,
  record_type text,
  record_id text,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_models (
  id uuid primary key default gen_random_uuid(),
  model_name text not null,
  version text not null,
  algorithm text not null,
  dataset_name text not null,
  dataset_uri text,
  features jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  artifact_path text,
  status text not null default 'CANDIDATE' check(status in ('CANDIDATE','ACTIVE','ARCHIVED','FAILED')),
  trained_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique(model_name,version)
);

create table if not exists public.ml_training_runs (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references public.ml_models(id),
  dataset_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'RUNNING' check(status in ('RUNNING','SUCCEEDED','FAILED')),
  metrics jsonb not null default '{}'::jsonb,
  notes text
);

create table if not exists public.ml_metrics (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ml_models(id) on delete cascade,
  metric_name text not null,
  metric_value numeric not null,
  split text not null default 'validation',
  created_at timestamptz not null default now(),
  unique(model_id,metric_name,split)
);

create table if not exists public.demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ml_models(id),
  product_id uuid references public.products(id),
  external_product_key text,
  forecast_date date not null,
  predicted_quantity numeric(14,3) not null check(predicted_quantity >= 0),
  lower_bound numeric(14,3),
  upper_bound numeric(14,3),
  created_at timestamptz not null default now(),
  unique(model_id,product_id,external_product_key,forecast_date)
);

create table if not exists public.product_recommendations (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references public.ml_models(id),
  customer_id uuid references public.profiles(id),
  source_product_id uuid references public.products(id),
  recommended_product_id uuid not null references public.products(id),
  score numeric not null,
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id),
  product_id uuid references public.products(id),
  recommendation_id uuid references public.product_recommendations(id),
  event_type text not null check(event_type in ('IMPRESSION','CLICK','ADD_TO_CART','PURCHASE')),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_forecasts (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ml_models(id),
  ingredient_id uuid not null references public.ingredients(id),
  forecast_date date not null,
  predicted_usage numeric(14,3) not null check(predicted_usage >= 0),
  current_stock_snapshot numeric(14,3) not null check(current_stock_snapshot >= 0),
  expected_remaining numeric(14,3) not null,
  suggested_reorder numeric(14,3) not null default 0 check(suggested_reorder >= 0),
  risk_level text not null check(risk_level in ('HEALTHY','WATCH','REORDER_SOON','CRITICAL')),
  created_at timestamptz not null default now(),
  unique(model_id,ingredient_id,forecast_date)
);

create index if not exists products_category_idx on public.products(category_id,active);
create index if not exists products_flags_idx on public.products(featured,bestseller,active);
create index if not exists product_images_product_idx on public.product_images(product_id,sort_order);
create index if not exists product_ingredients_lookup_idx on public.product_ingredients(product_id,variant_id,addon_id);
create index if not exists inventory_movements_item_time_idx on public.inventory_movements(inventory_item_id,created_at desc);
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);
create index if not exists orders_customer_time_idx on public.orders(customer_id,created_at desc);
create index if not exists orders_status_time_idx on public.orders(status,created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status,created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists status_history_order_idx on public.order_status_history(order_id,created_at);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists payments_status_idx on public.payments(status,created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id,read_at,created_at desc);
create index if not exists promotion_usages_customer_idx on public.promotion_usages(promotion_id,customer_id);
create index if not exists activity_logs_time_idx on public.activity_logs(created_at desc);
create index if not exists forecasts_date_idx on public.demand_forecasts(forecast_date,product_id);
create index if not exists recommendations_customer_idx on public.product_recommendations(customer_id,score desc);
