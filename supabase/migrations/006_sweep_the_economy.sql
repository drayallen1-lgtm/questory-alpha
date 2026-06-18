-- Questory Sweep #2: The Economy — marketplace, coupons, premium, Stripe foundation

-- Extend profile roles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'sponsor', 'creator'));

alter table public.profiles
  add column if not exists economy jsonb not null default '{}'::jsonb;

-- Adventure economy fields
alter table public.adventures
  add column if not exists tier text not null default 'standard' check (tier in ('standard', 'premium')),
  add column if not exists premium_coin_cost integer not null default 250,
  add column if not exists creator_profile_id text,
  add column if not exists sponsor_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists sponsor_verified boolean not null default false,
  add column if not exists avg_rating numeric(3,2) default 4.8,
  add column if not exists review_count integer not null default 0,
  add column if not exists campaign_paused boolean not null default false,
  add column if not exists campaign_budget_credits numeric(10,2) default 0,
  add column if not exists coupon_quantity integer,
  add column if not exists coupon_terms text,
  add column if not exists coupon_expiration_days integer default 7;

-- Creator public profiles
create table if not exists public.creator_profiles (
  id text primary key,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  bio text default '',
  followers integer not null default 0,
  completions integer not null default 0,
  rating numeric(3,2) default 5.0,
  review_count integer not null default 0,
  adventures_created integer not null default 0,
  sponsor_partners jsonb not null default '[]'::jsonb,
  badges jsonb not null default '[]'::jsonb,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sponsor business profiles
create table if not exists public.sponsor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_name text not null,
  business_email text,
  logo_url text,
  website text,
  verified boolean not null default false,
  verification_agreed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- Stripe-ready wallet foundation (credits, not cash payouts yet)
create table if not exists public.sponsor_wallets (
  id uuid primary key default gen_random_uuid(),
  sponsor_profile_id uuid not null references public.sponsor_profiles (id) on delete cascade,
  balance_credits numeric(12,2) not null default 0,
  currency text not null default 'USD',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sponsor_profile_id)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.sponsor_wallets (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'spend', 'refund', 'premium_split')),
  amount numeric(12,2) not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_reward_id text not null,
  adventure_id text references public.adventures (id) on delete set null,
  sponsor_profile_id uuid references public.sponsor_profiles (id) on delete set null,
  qr_payload text not null,
  redeemed_at timestamptz not null default now(),
  redeemed_by uuid references public.profiles (id) on delete set null
);

create table if not exists public.premium_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  adventure_id text not null references public.adventures (id) on delete cascade,
  coins_spent integer not null,
  creator_share integer not null default 0,
  platform_share integer not null default 0,
  unlocked_at timestamptz not null default now(),
  unique (user_id, adventure_id)
);

create table if not exists public.adventure_ratings (
  id uuid primary key default gen_random_uuid(),
  adventure_id text not null references public.adventures (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text default '',
  created_at timestamptz not null default now(),
  unique (adventure_id, user_id)
);

create table if not exists public.creator_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  creator_id text not null references public.creator_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id)
);

create table if not exists public.seasonal_events (
  id text primary key,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  badge_id text,
  badge_label text,
  coin_reward integer not null default 500,
  sponsor_name text,
  leaderboard_reset boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsored_leaderboards (
  id text primary key,
  sponsor_name text not null,
  title text not null,
  prize_description text,
  period text not null check (period in ('weekly', 'monthly', 'seasonal')),
  starts_at date,
  ends_at date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed creator profiles
insert into public.creator_profiles (id, name, bio, followers, completions, rating, review_count, adventures_created, sponsor_partners, badges, verified)
values
  ('parsons-heritage', 'Parsons Heritage', 'Preserving railroad history through real-world treasure trails.', 842, 1241, 4.9, 318, 12, '["Parsons Heritage Trail","Neosho River Council"]'::jsonb, '["keeper-of-parsons"]'::jsonb, true),
  ('questory-founders', 'QUESTORY Founders', 'Original trail builders behind Founder Hunts.', 2104, 3890, 5.0, 412, 6, '["QUESTORY Founders"]'::jsonb, '["founders-circle"]'::jsonb, true)
on conflict (id) do nothing;

insert into public.seasonal_events (id, name, description, start_date, end_date, badge_id, badge_label, coin_reward, sponsor_name, leaderboard_reset)
values (
  'parsons-summer-quest-2026',
  'Parsons Summer Quest',
  'Complete any Parsons hunt during July for exclusive rewards.',
  '2026-07-01', '2026-07-31',
  'summer-explorer', 'Summer Explorer Badge',
  500, 'Parsons Heritage Trail', true
) on conflict (id) do nothing;

insert into public.sponsored_leaderboards (id, sponsor_name, title, prize_description, period, ends_at)
values
  ('pepsi-monthly', 'Pepsi', 'Most Adventures Completed This Month', '$50 Gift Card', 'monthly', '2026-06-30'),
  ('dq-weekly', 'Dairy Queen Parsons', 'Weekly Trail Blazers', 'FREE SMALL BLIZZARD', 'weekly', '2026-06-22')
on conflict (id) do nothing;

-- Demo sponsor verification on Parsons adventures
update public.adventures
set sponsor_verified = true, creator_profile_id = 'parsons-heritage'
where collection_id = 'parsons-legends' or id = 'parsons-gold-rush';

update public.adventures
set creator_profile_id = 'questory-founders', tier = 'premium', premium_coin_cost = 250
where id = 'founders-parsons-lost';

-- RLS (read published, own rows for writes — extend as needed)
alter table public.creator_profiles enable row level security;
alter table public.sponsor_profiles enable row level security;
alter table public.adventure_ratings enable row level security;

drop policy if exists creator_profiles_read on public.creator_profiles;
create policy creator_profiles_read on public.creator_profiles for select using (true);
drop policy if exists adventure_ratings_read on public.adventure_ratings;
create policy adventure_ratings_read on public.adventure_ratings for select using (true);
drop policy if exists adventure_ratings_insert on public.adventure_ratings;
create policy adventure_ratings_insert on public.adventure_ratings for insert with check (auth.uid() = user_id);
