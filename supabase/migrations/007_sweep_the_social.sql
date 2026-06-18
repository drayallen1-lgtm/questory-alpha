-- Questory Sweep #3: The Social Layer

alter table public.profiles
  add column if not exists social jsonb not null default '{}'::jsonb;

alter table public.adventures
  add column if not exists play_mode text not null default 'both'
    check (play_mode in ('solo', 'team', 'both')),
  add column if not exists heat_score integer not null default 0,
  add column if not exists heat_category text default 'trending';

create table if not exists public.teams (
  id text primary key,
  name text not null,
  banner text default '🏴',
  motto text default '',
  badge text default 'Team Crest',
  is_public boolean not null default true,
  rank integer not null default 99,
  members_count integer not null default 0,
  completions integer not null default 0,
  points integer not null default 0,
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id text not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'officer', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.team_challenges (
  id uuid primary key default gen_random_uuid(),
  team_id text references public.teams (id) on delete cascade,
  adventure_id text references public.adventures (id) on delete set null,
  challenger_id uuid references public.profiles (id) on delete set null,
  target_name text,
  metric text not null default 'time',
  status text not null default 'pending',
  prize_coins integer not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.adventure_comments (
  id uuid primary key default gen_random_uuid(),
  adventure_id text not null references public.adventures (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  author_name text not null default 'Explorer',
  body text not null,
  pinned boolean not null default false,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.adventure_photos (
  id uuid primary key default gen_random_uuid(),
  adventure_id text not null references public.adventures (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  caption text,
  storage_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  follow_type text not null check (follow_type in ('creator', 'sponsor', 'team', 'friend')),
  follow_id text not null,
  follow_name text,
  created_at timestamptz not null default now(),
  primary key (follower_id, follow_type, follow_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  story_type text not null default 'victory',
  body text,
  adventure_id text references public.adventures (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.live_events (
  id text primary key,
  adventure_id text references public.adventures (id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_entries integer not null default 100,
  participants integer not null default 0,
  exclusive_reward text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ghost_runs (
  id uuid primary key default gen_random_uuid(),
  adventure_id text not null references public.adventures (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  clue_index integer not null default 0,
  duration_ms integer not null,
  direction text,
  created_at timestamptz not null default now()
);

create table if not exists public.season_rankings (
  id uuid primary key default gen_random_uuid(),
  season_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null default 0,
  tier text not null default 'bronze',
  updated_at timestamptz not null default now(),
  unique (season_id, user_id)
);

create table if not exists public.heat_scores (
  adventure_id text primary key references public.adventures (id) on delete cascade,
  score integer not null default 0,
  category text not null default 'trending',
  updated_at timestamptz not null default now()
);

insert into public.teams (id, name, banner, motto, badge, is_public, rank, members_count, completions, points)
values
  ('parsons-explorers', 'Parsons Explorers', '🧭', 'Every street has a story.', 'Explorer Crest', true, 1, 24, 186, 4200),
  ('ghost-hunters-kansas', 'Ghost Hunters of Kansas', '👻', 'We hunt what the daylight misses.', 'Night Hunter', true, 2, 18, 142, 3800),
  ('night-shift', 'The Night Shift', '🌙', 'After dark is when legends wake.', 'Moon Trail', true, 3, 11, 98, 2900),
  ('team-bigfoot', 'Team Bigfoot', '🦶', 'Leave prints, not spoilers.', 'Cryptid Crew', true, 4, 31, 210, 5100),
  ('family-quest-crew', 'Family Quest Crew', '👨‍👩‍👧', 'Adventure is better together.', 'Family Trail', false, 5, 6, 44, 1200)
on conflict (id) do nothing;

insert into public.live_events (id, adventure_id, title, description, starts_at, ends_at, max_entries, participants, exclusive_reward)
values
  ('midnight-ghost-walk', 'union-depot-ghost', 'Midnight Ghost Walk', 'After-dark team hunt through the depot district.', '2026-06-20 20:00:00+00', '2026-06-21 00:00:00+00', 50, 32, 'Ghost Walker Badge'),
  ('founders-friday', 'founders-parsons-lost', 'Founder''s Friday Live', 'Limited entry — starts Friday at 8PM.', '2026-06-20 20:00:00+00', '2026-06-20 23:00:00+00', 30, 18, '500 Bonus Coins')
on conflict (id) do nothing;

insert into public.adventure_comments (adventure_id, author_name, body)
values
  ('union-depot-ghost', 'Marcus T.', 'That train clue gave me chills.'),
  ('parsons-gold-rush', 'Elena R.', 'Took my kids. Amazing.'),
  ('river-sentinel', 'Jake M.', 'We found the medallion at sunset.')
on conflict do nothing;

alter table public.teams enable row level security;
alter table public.adventure_comments enable row level security;
alter table public.stories enable row level security;

drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select using (true);
drop policy if exists comments_read on public.adventure_comments;
create policy comments_read on public.adventure_comments for select using (true);
drop policy if exists stories_read on public.stories;
create policy stories_read on public.stories for select using (true);
