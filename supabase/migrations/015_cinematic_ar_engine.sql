-- Sweep 9: Cinematic AR Engine
-- Safe / idempotent — adds AR scene columns for clues and adventures.

alter table if exists public.clues
  add column if not exists ar_scene jsonb not null default '{}'::jsonb;

alter table if exists public.adventures
  add column if not exists ar_finale jsonb not null default '{}'::jsonb;

alter table if exists public.adventures
  add column if not exists ar_theme text not null default 'none';

comment on column public.clues.ar_scene is 'Cinematic AR scene config for this clue';
comment on column public.adventures.ar_finale is 'Cinematic AR finale scene before claim/victory';
comment on column public.adventures.ar_theme is 'AR visual theme preset (horror, fantasy, etc.)';
