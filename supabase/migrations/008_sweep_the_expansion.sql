-- Questory Sweep #4: The Platform Expansion

alter table public.profiles
  add column if not exists expansion jsonb not null default '{}'::jsonb;

alter table public.adventures
  add column if not exists finder_mode text not null default 'finder'
    check (finder_mode in ('traditional', 'finder', 'ar_enhanced')),
  add column if not exists ar_asset_type text default 'ghost_lantern',
  add column if not exists is_legendary_hunt boolean not null default false,
  add column if not exists legendary_type text,
  add column if not exists cash_prize_pool numeric(10, 2) default 0,
  add column if not exists cash_payouts jsonb default '{"first": 0.6, "second": 0.3, "random": 0.1}'::jsonb,
  add column if not exists is_sponsored_drop boolean not null default false,
  add column if not exists sponsored_drop_id text,
  add column if not exists storefront_price numeric(8, 2);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'premium')),
  status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance_cents integer not null default 0,
  currency text not null default 'USD',
  stripe_account_id text,
  stripe_connected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_hunt_payouts (
  id uuid primary key default gen_random_uuid(),
  adventure_id text not null references public.adventures (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  placement integer not null default 1,
  amount_cents integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.sponsored_drops (
  id text primary key,
  sponsor_name text not null,
  title text not null,
  reward text not null,
  budget numeric(10, 2) not null default 100,
  radius_miles integer not null default 15,
  duration_days integer not null default 14,
  adventure_id text references public.adventures (id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_storefront_products (
  id text primary key,
  creator_id text not null,
  product_type text not null check (product_type in ('hunt', 'collection')),
  title text not null,
  description text default '',
  price numeric(8, 2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsor_marketplace_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid references public.profiles (id) on delete set null,
  template_id text not null,
  sponsor_name text not null,
  reward text not null,
  budget numeric(10, 2) not null,
  radius_miles integer not null,
  duration_days integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.studio_partners (
  id text primary key,
  name text not null,
  verified boolean not null default false,
  featured boolean not null default false,
  revenue_share numeric(4, 2) not null default 0.70,
  hunts_count integer not null default 0,
  collections_count integer not null default 0,
  rating numeric(3, 1) default 4.5,
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.passport_stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  region text not null,
  city text not null,
  stamped_at timestamptz not null default now(),
  unique (user_id, region, city)
);

-- Seed sponsored drops
insert into public.sponsored_drops (id, sponsor_name, title, reward, budget, radius_miles, duration_days, adventure_id)
values
  ('mcdonalds-golden-fry', 'McDonald''s', 'Ronald''s Lost Golden Fry', 'Free medium fries', 100, 15, 14, 'union-depot-ghost'),
  ('pepsi-summer-refresh', 'Pepsi', 'The Summer Refresh Hunt', 'Free 20oz Pepsi', 250, 25, 21, 'river-sentinel'),
  ('dq-blizzard-rush', 'Dairy Queen', 'Blizzard Rush Weekend', 'Buy one get one Blizzard', 150, 10, 3, 'iron-horse'),
  ('walmart-hidden-savings', 'Walmart', 'Hidden Savings Adventure', '$5 off $25 purchase', 500, 30, 30, 'parsons-gold-rush')
on conflict (id) do nothing;

-- Seed storefront products
insert into public.creator_storefront_products (id, creator_id, product_type, title, description, price)
values
  ('hunt-starter', 'parsons-heritage', 'hunt', 'Starter Hunt', 'Single premium trail with medallion reward.', 4.99),
  ('hunt-premium', 'parsons-heritage', 'hunt', 'Premium Hunt Pack', 'Three hunts + exclusive coupon bundle.', 9.99),
  ('hunt-legendary', 'questory-founders', 'hunt', 'Legendary Hunt Experience', 'Full legendary trail with AR medallion.', 19.99),
  ('collection-parsons', 'parsons-heritage', 'collection', 'Parsons Legends Pack', 'Complete collection access + badge.', 14.99),
  ('collection-ghost', 'parsons-heritage', 'collection', 'Kansas Ghost Trails', 'All haunted trails in southeast Kansas.', 12.99),
  ('collection-route66', 'questory-founders', 'collection', 'Route 66 Series', 'Cross-state Route 66 adventure bundle.', 24.99)
on conflict (id) do nothing;

-- Seed studio partners
insert into public.studio_partners (id, name, verified, featured, revenue_share, hunts_count, collections_count, rating)
values
  ('parsons-heritage', 'Parsons Heritage', true, true, 0.70, 12, 3, 4.9),
  ('questory-founders', 'QUESTORY Founders', true, true, 0.75, 6, 2, 5.0),
  ('route66-collective', 'Route 66 Collective', true, false, 0.65, 8, 1, 4.7)
on conflict (id) do nothing;

-- Mark legendary adventures
update public.adventures
set is_legendary_hunt = true, legendary_type = 'lost_ledger', finder_mode = 'ar_enhanced', ar_asset_type = 'ancient_artifact'
where id = 'parsons-gold-rush';

update public.adventures
set is_legendary_hunt = true, legendary_type = 'founder_relic', cash_prize_pool = 250
where id = 'founders-parsons-lost';

update public.adventures
set is_legendary_hunt = true, legendary_type = 'midnight_train', finder_mode = 'ar_enhanced', ar_asset_type = 'ghost_lantern'
where id = 'union-depot-ghost';

update public.adventures
set is_legendary_hunt = true, legendary_type = 'black_lantern', finder_mode = 'finder'
where id = 'neosho-legend';

-- RLS read policies
alter table public.sponsored_drops enable row level security;
alter table public.creator_storefront_products enable row level security;
alter table public.studio_partners enable row level security;

create policy "Public read sponsored drops" on public.sponsored_drops for select using (true);
create policy "Public read storefront" on public.creator_storefront_products for select using (active = true);
create policy "Public read studios" on public.studio_partners for select using (true);
