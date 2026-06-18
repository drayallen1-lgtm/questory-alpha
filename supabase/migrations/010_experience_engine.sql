-- Questory Sweep #5: The Experience Engine

alter table public.profiles
  add column if not exists experience jsonb not null default '{}'::jsonb;

alter table public.adventures
  add column if not exists adventure_scale text default 'city',
  add column if not exists adventure_template text default 'from_scratch',
  add column if not exists experience_settings jsonb default '{}'::jsonb,
  add column if not exists creator_analytics jsonb default '{}'::jsonb,
  add column if not exists adaptive_difficulty jsonb default '{}'::jsonb;

alter table public.clues
  add column if not exists clue_type text default 'text_riddle',
  add column if not exists choices jsonb default '[]'::jsonb,
  add column if not exists audio_url text,
  add column if not exists video_url text,
  add column if not exists image_url text,
  add column if not exists partial_hint text,
  add column if not exists full_hint text;

create table if not exists public.verification_runs (
  id text primary key,
  adventure_id text not null references public.adventures (id) on delete cascade,
  creator_id uuid references public.profiles (id) on delete set null,
  status text not null default 'in_progress',
  checkpoints jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.dynamic_hint_events (
  id uuid primary key default gen_random_uuid(),
  adventure_id text not null references public.adventures (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  clue_index integer not null default 0,
  hint_tier text not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists verification_runs_adventure_idx on public.verification_runs (adventure_id);

alter table public.verification_runs enable row level security;

drop policy if exists "Creators read own verification runs" on public.verification_runs;
create policy "Creators read own verification runs"
  on public.verification_runs for select
  using (creator_id = auth.uid() or public.is_admin());

drop policy if exists "Creators insert verification runs" on public.verification_runs;
create policy "Creators insert verification runs"
  on public.verification_runs for insert
  with check (creator_id = auth.uid() or public.is_admin());

-- Seed demo backyard horror adventure settings on iron-horse
update public.adventures
set
  adventure_scale = 'backyard',
  adventure_template = 'horror',
  experience_settings = jsonb_build_object(
    'toolkit', 'horror',
    'atmosphere', 'creepy',
    'backyardPrecision', true,
    'dynamicHintsEnabled', true,
    'soundEffects', jsonb_build_array('whispers', 'footsteps')
  )
where id = 'union-depot-ghost';

update public.adventures
set
  adventure_scale = 'backyard',
  adventure_template = 'family_fun',
  experience_settings = jsonb_build_object(
    'toolkit', 'family',
    'victoryMessage', 'You found Grandpa''s treasure!',
    'backyardPrecision', true
  )
where id = 'iron-horse';
