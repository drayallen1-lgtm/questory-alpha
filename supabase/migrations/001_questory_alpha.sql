-- Questory Alpha schema + RLS
-- Run in Supabase SQL Editor or via Supabase CLI

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  coins integer not null default 0,
  entries integer not null default 0,
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Adventures
-- ---------------------------------------------------------------------------
create table if not exists public.adventures (
  id text primary key,
  creator_id uuid references public.profiles (id) on delete set null,
  title text not null,
  location text,
  story text,
  sponsor_name text,
  sponsor_logo_url text,
  sponsor_website text,
  distance text,
  prize text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  difficulty integer not null default 3,
  claim_code text not null,
  reward_coins integer not null default 0,
  pot_entries integer not null default 0,
  bonus_finds jsonb not null default '[]'::jsonb,
  final_rewards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists adventures_updated_at on public.adventures;
create trigger adventures_updated_at
  before update on public.adventures
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Clues
-- ---------------------------------------------------------------------------
create table if not exists public.clues (
  id text primary key,
  adventure_id text not null references public.adventures (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  text text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 500,
  bonus_reward_text text
);

create index if not exists clues_adventure_id_idx on public.clues (adventure_id);

-- ---------------------------------------------------------------------------
-- Rewards (adventure reward templates)
-- ---------------------------------------------------------------------------
create table if not exists public.rewards (
  id text primary key,
  adventure_id text not null references public.adventures (id) on delete cascade,
  sort_order integer not null default 0,
  type text not null,
  icon text,
  title text not null,
  description text,
  value_label text,
  redemption_instructions text,
  expiration_days integer not null default 0
);

create index if not exists rewards_adventure_id_idx on public.rewards (adventure_id);

-- ---------------------------------------------------------------------------
-- User rewards (vault)
-- ---------------------------------------------------------------------------
create table if not exists public.user_rewards (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  adventure_id text references public.adventures (id) on delete set null,
  reward_id text references public.rewards (id) on delete set null,
  type text not null,
  icon text,
  title text not null,
  description text,
  value_label text,
  redemption_instructions text,
  adventure_title text,
  sponsor_name text,
  sponsor_logo_url text,
  sponsor_website text,
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired')),
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  expires_at timestamptz
);

create index if not exists user_rewards_user_id_idx on public.user_rewards (user_id);

-- ---------------------------------------------------------------------------
-- Claim history
-- ---------------------------------------------------------------------------
create table if not exists public.claim_history (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  adventure_id text references public.adventures (id) on delete set null,
  kind text not null default 'reward' check (kind in ('reward', 'certificate')),
  adventure_name text,
  reward_name text,
  type text,
  status text,
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  share_text text,
  sponsor_name text,
  sponsor_logo_url text,
  sponsor_website text,
  verified boolean not null default false
);

create index if not exists claim_history_user_id_idx on public.claim_history (user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_read_adventure(adventure_row public.adventures)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    adventure_row.status = 'published'
    or public.is_admin()
    or adventure_row.creator_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.adventures enable row level security;
alter table public.clues enable row level security;
alter table public.rewards enable row level security;
alter table public.user_rewards enable row level security;
alter table public.claim_history enable row level security;

-- Profiles
drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Adventures
drop policy if exists "Adventures: read published" on public.adventures;
create policy "Adventures: read published"
  on public.adventures for select
  using (public.can_read_adventure(adventures));

drop policy if exists "Adventures: admin insert" on public.adventures;
create policy "Adventures: admin insert"
  on public.adventures for insert
  with check (public.is_admin());

drop policy if exists "Adventures: admin update" on public.adventures;
create policy "Adventures: admin update"
  on public.adventures for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Adventures: admin delete" on public.adventures;
create policy "Adventures: admin delete"
  on public.adventures for delete
  using (public.is_admin());

-- Clues (visibility follows parent adventure)
drop policy if exists "Clues: read via adventure" on public.clues;
create policy "Clues: read via adventure"
  on public.clues for select
  using (
    exists (
      select 1 from public.adventures a
      where a.id = clues.adventure_id
        and public.can_read_adventure(a)
    )
  );

drop policy if exists "Clues: admin write" on public.clues;
create policy "Clues: admin write"
  on public.clues for all
  using (public.is_admin())
  with check (public.is_admin());

-- Rewards templates
drop policy if exists "Rewards: read via adventure" on public.rewards;
create policy "Rewards: read via adventure"
  on public.rewards for select
  using (
    exists (
      select 1 from public.adventures a
      where a.id = rewards.adventure_id
        and public.can_read_adventure(a)
    )
  );

drop policy if exists "Rewards: admin write" on public.rewards;
create policy "Rewards: admin write"
  on public.rewards for all
  using (public.is_admin())
  with check (public.is_admin());

-- User rewards
drop policy if exists "User rewards: read own" on public.user_rewards;
create policy "User rewards: read own"
  on public.user_rewards for select
  using (auth.uid() = user_id);

drop policy if exists "User rewards: insert own" on public.user_rewards;
create policy "User rewards: insert own"
  on public.user_rewards for insert
  with check (auth.uid() = user_id);

drop policy if exists "User rewards: update own" on public.user_rewards;
create policy "User rewards: update own"
  on public.user_rewards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "User rewards: delete own" on public.user_rewards;
create policy "User rewards: delete own"
  on public.user_rewards for delete
  using (auth.uid() = user_id);

-- Claim history
drop policy if exists "Claim history: read own" on public.claim_history;
create policy "Claim history: read own"
  on public.claim_history for select
  using (auth.uid() = user_id);

drop policy if exists "Claim history: insert own" on public.claim_history;
create policy "Claim history: insert own"
  on public.claim_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Claim history: update own" on public.claim_history;
create policy "Claim history: update own"
  on public.claim_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Claim history: delete own" on public.claim_history;
create policy "Claim history: delete own"
  on public.claim_history for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed: Parsons Gold Rush (optional — safe to re-run)
-- ---------------------------------------------------------------------------
insert into public.adventures (
  id, title, location, story, sponsor_name, sponsor_logo_url, sponsor_website,
  distance, prize, status, difficulty, claim_code, reward_coins, pot_entries,
  bonus_finds, final_rewards
) values (
  'parsons-gold-rush',
  'The Parsons Gold Rush',
  'Parsons, Kansas',
  'A railroad conductor vanished before cashing his final paycheck. Legend says he left behind a hidden medallion somewhere in Parsons. Follow the clues. Unlock the trail. Claim the treasure.',
  'Parsons Heritage Trail',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Parsons_Kansas_Logo.png/120px-Parsons_Kansas_Logo.png',
  'https://www.parsonsks.com',
  '0.8 mi',
  'Legendary Medallion + Local Rewards',
  'published',
  3,
  'PARSONS128',
  50,
  5,
  '[
    {"id":"bonus-1","afterStep":0,"title":"Conductor''s Token","desc":"A brass platform token hidden near the old depot bench.","icon":"🎫","coins":10,"type":"bonus"},
    {"id":"bonus-2","afterStep":1,"title":"Main Street Perk","desc":"20% off at Parsons Diner — reward for sharp eyes.","icon":"🍔","type":"coupon","couponCode":"PARSONS20"}
  ]'::jsonb,
  '[
    {"type":"medallion","icon":"🥇","title":"Parsons Conductor Medallion #128","desc":"Verified virtual medallion from The Parsons Gold Rush","valueLabel":"Legendary Collectible","redemptionInstructions":"Your medallion is saved in your Questory Vault.","expirationDays":0},
    {"type":"coupon","icon":"☕","title":"Heritage Coffee Coupon","desc":"Redeem a free drink at Main Street Roasters","valueLabel":"Free drink","redemptionInstructions":"Visit Main Street Roasters in downtown Parsons.","expirationDays":30},
    {"type":"physical","icon":"📦","title":"Legendary Drop Entry","desc":"Eligible for the physical Parsons medallion draw","valueLabel":"Limited drop entry","redemptionInstructions":"Winners are contacted by Parsons Heritage Trail.","expirationDays":90}
  ]'::jsonb
) on conflict (id) do nothing;

insert into public.clues (id, adventure_id, sort_order, title, text, latitude, longitude, radius_meters) values
  ('clue-1', 'parsons-gold-rush', 0, 'Depot Echo', 'Where iron rails crossed and travelers waited beneath the clock tower, find the name of the vanished conductor carved in memory.', 37.3392, -95.261, 500),
  ('clue-2', 'parsons-gold-rush', 1, 'Main Street Ledger', 'Walk the brick line where shops keep old ledger books. Count the windows between the bakery and the bookstore — that number is your key.', 37.3405, -95.263, 500),
  ('clue-3', 'parsons-gold-rush', 2, 'River Bridge Signal', 'Cross the bridge where the Neosho runs slow. Look for the rusted signal post pointing east — the medallion waits beyond the last rivet.', 37.3348, -95.2545, 500)
on conflict (id) do nothing;

insert into public.rewards (id, adventure_id, sort_order, type, icon, title, description, value_label, redemption_instructions, expiration_days) values
  ('parsons-gold-rush-reward-0', 'parsons-gold-rush', 0, 'medallion', '🥇', 'Parsons Conductor Medallion #128', 'Verified virtual medallion from The Parsons Gold Rush', 'Legendary Collectible', 'Your medallion is saved in your Questory Vault.', 0),
  ('parsons-gold-rush-reward-1', 'parsons-gold-rush', 1, 'coupon', '☕', 'Heritage Coffee Coupon', 'Redeem a free drink at Main Street Roasters', 'Free drink', 'Visit Main Street Roasters in downtown Parsons.', 30),
  ('parsons-gold-rush-reward-2', 'parsons-gold-rush', 2, 'physical', '📦', 'Legendary Drop Entry', 'Eligible for the physical Parsons medallion draw', 'Limited drop entry', 'Winners are contacted by Parsons Heritage Trail.', 90)
on conflict (id) do nothing;
