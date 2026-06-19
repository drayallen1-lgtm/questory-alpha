-- Questory Sweep #8: The Growth Engine

alter table public.profiles
  add column if not exists growth jsonb not null default '{}'::jsonb;

alter table public.adventures
  add column if not exists quest_code text,
  add column if not exists remix_of text,
  add column if not exists remix_credit jsonb,
  add column if not exists growth_analytics jsonb;

-- Referral events lookup (public read for leaderboard-style stats)
create table if not exists public.referral_events (
  id text primary key,
  referrer_id uuid references public.profiles(id) on delete cascade,
  action_id text not null,
  friend_name text,
  coins integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.referral_events enable row level security;

drop policy if exists "referral_events_read_own" on public.referral_events;
create policy "referral_events_read_own"
  on public.referral_events for select
  using (auth.uid() = referrer_id);

drop policy if exists "referral_events_insert_own" on public.referral_events;
create policy "referral_events_insert_own"
  on public.referral_events for insert
  with check (auth.uid() = referrer_id);

-- Weekend community events
create table if not exists public.community_events (
  id text primary key,
  day_label text not null,
  title text not null,
  adventure_id text references public.adventures(id) on delete set null,
  event_time text,
  sponsor_name text,
  sort_order integer not null default 0
);

alter table public.community_events enable row level security;

drop policy if exists "community_events_public_read" on public.community_events;
create policy "community_events_public_read"
  on public.community_events for select
  using (true);

insert into public.community_events (id, day_label, title, adventure_id, event_time, sponsor_name, sort_order)
values
  ('fri-ghost-walk', 'Friday', 'Parsons Ghost Walk', 'union-depot-ghost', '8:00 PM', 'Parsons Heritage', 1),
  ('sat-dq-quest', 'Saturday', 'DQ Summer Quest', null, '10:00 AM', 'Dairy Queen', 2),
  ('sun-bible-quest', 'Sunday', 'Bible Quest', null, '2:00 PM', 'Community Church', 3)
on conflict (id) do update set
  title = excluded.title,
  adventure_id = excluded.adventure_id,
  event_time = excluded.event_time,
  sponsor_name = excluded.sponsor_name;

-- Seed quest codes on flagship adventures
update public.adventures set quest_code = 'GHOST-DEPOT' where id = 'union-depot-ghost' and (quest_code is null or quest_code = '');
update public.adventures set quest_code = 'HIDDEN-LEDGER' where id = 'parsons-gold-rush' and (quest_code is null or quest_code = '');
update public.adventures set quest_code = 'FOUNDERS-FRI' where id = 'founders-parsons-lost' and (quest_code is null or quest_code = '');
update public.adventures set quest_code = 'NEOSHO-LEGEND' where id = 'neosho-legend' and (quest_code is null or quest_code = '');
update public.adventures set quest_code = 'IRON-HORSE' where id = 'iron-horse' and (quest_code is null or quest_code = '');
update public.adventures set quest_code = 'BDAY-DEMO' where id = 'demo-missing-birthday-gift' and (quest_code is null or quest_code = '');

update public.adventures set growth_analytics = coalesce(growth_analytics, '{}'::jsonb) || '{"views":1420,"started":912,"completed":581,"mostSharedAsset":"Victory Certificate","dropOffClue":3}'::jsonb
where id = 'union-depot-ghost';

update public.adventures set growth_analytics = coalesce(growth_analytics, '{}'::jsonb) || '{"views":890,"started":620,"completed":412,"mostSharedAsset":"Victory Certificate","dropOffClue":2}'::jsonb
where id = 'parsons-gold-rush';
