-- Questory Sweep #6: The World Engine

alter table public.profiles
  add column if not exists world jsonb not null default '{}'::jsonb;

alter table public.adventures
  add column if not exists world_config jsonb default '{}'::jsonb;

alter table public.clues
  add column if not exists branch_options jsonb default '[]'::jsonb;

create table if not exists public.world_events (
  id text primary key,
  city text not null,
  title text not null,
  description text,
  icon text,
  bonus jsonb default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.npc_characters (
  id text primary key,
  adventure_id text references public.adventures (id) on delete cascade,
  name text not null,
  role text,
  avatar text,
  dialogues jsonb not null default '[]'::jsonb,
  voice_note_url text,
  created_at timestamptz not null default now()
);

create index if not exists world_events_city_idx on public.world_events (city);
create index if not exists npc_characters_adventure_idx on public.npc_characters (adventure_id);

alter table public.world_events enable row level security;
alter table public.npc_characters enable row level security;

drop policy if exists "Public read world events" on public.world_events;
create policy "Public read world events"
  on public.world_events for select
  using (true);

drop policy if exists "Public read npc characters" on public.npc_characters;
create policy "Public read npc characters"
  on public.npc_characters for select
  using (true);

-- Seed union depot branching + NPC world config
update public.adventures
set world_config = jsonb_build_object(
  'branchingEnabled', true,
  'worldEventTags', jsonb_build_array('ghost-walk'),
  'hiddenDiscoveryIds', jsonb_build_array('depot-lantern'),
  'alternateEndings', jsonb_build_array(
    jsonb_build_object(
      'id', 'ghost',
      'pathId', 'ghost',
      'title', 'Ghost Ledger Ending',
      'description', 'You followed the conductor into the shadows.',
      'medallionTitle', 'Depot Ghost Medallion'
    ),
    jsonb_build_object(
      'id', 'historian',
      'pathId', 'historian',
      'title', 'Historian Ending',
      'description', 'The archives reveal what the platform hides.',
      'medallionTitle', 'Archivist Crest'
    )
  ),
  'npcs', jsonb_build_array(
    jsonb_build_object(
      'id', 'conductor-ghost',
      'name', 'The Conductor',
      'role', 'Story Guide',
      'avatar', '🎩',
      'dialogues', jsonb_build_array(
        jsonb_build_object('id', 'intro', 'text', 'The rails remember every soul who passed through.', 'mood', 'mysterious'),
        jsonb_build_object('id', 'branch', 'text', 'Brave the platform shadows, or search the archives.', 'mood', 'warning')
      )
    )
  )
)
where id = 'union-depot-ghost';

update public.clues
set branch_options = jsonb_build_array(
  jsonb_build_object('id', 'platform', 'label', 'Brave the platform shadows', 'pathId', 'ghost'),
  jsonb_build_object('id', 'archives', 'label', 'Search the archive room', 'pathId', 'historian')
)
where id = 'ud-1';

-- Black Lantern unlockable via discovery
update public.adventures
set
  status = 'published',
  world_config = jsonb_build_object(
    'unlockRequirement', jsonb_build_object('type', 'discovery', 'discoveryId', 'black-lantern-whisper'),
    'worldEventTags', jsonb_build_array('legendary-roaming')
  )
where id = 'neosho-legend';

insert into public.world_events (id, city, title, description, icon, bonus, ends_at)
values
  (
    'parsons-summer-festival',
    'Parsons',
    'Parsons Summer Festival',
    'Double coins on downtown hunts this weekend.',
    '🎪',
    '{"coinMultiplier": 2, "badgeId": "festival-explorer"}'::jsonb,
    '2026-08-15T23:59:59+00'::timestamptz
  ),
  (
    'ghost-walk-weekend',
    'Parsons',
    'Ghost Walk Weekend',
    'Haunted overlays and limited ghost badges.',
    '👻',
    '{"coinBonus": 25, "badgeId": "ghost-walker"}'::jsonb,
    '2026-07-04T23:59:59+00'::timestamptz
  )
on conflict (id) do nothing;
