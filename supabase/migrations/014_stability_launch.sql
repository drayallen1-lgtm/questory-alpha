-- Questory Stability & Launch Sweep

alter table public.profiles
  add column if not exists launch_funnel jsonb not null default '{}'::jsonb;
