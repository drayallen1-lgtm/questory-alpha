-- Questory Sweep #7: The Invitation

alter table public.profiles
  add column if not exists onboarding jsonb not null default '{}'::jsonb,
  add column if not exists accessibility jsonb not null default '{}'::jsonb,
  add column if not exists first_time_metrics jsonb not null default '{}'::jsonb;

-- Demo adventure seed (idempotent update if adventures table has demo row)
insert into public.adventures (
  id,
  title,
  location,
  story,
  sponsor_name,
  status,
  difficulty,
  claim_code,
  claim_method,
  reward_coins,
  estimated_minutes,
  adventure_scale,
  adventure_template,
  experience_settings,
  final_rewards,
  city,
  state,
  region
)
values (
  'demo-missing-birthday-gift',
  'The Missing Birthday Gift',
  'Your Backyard',
  'Someone hid the birthday gift! Follow three simple clues around the yard to find it.',
  'Questory',
  'published',
  1,
  'BDAYGIFT',
  'secret_code',
  25,
  3,
  'backyard',
  'family_fun',
  '{"toolkit":"family","backyardPrecision":true,"victoryMessage":"You found the missing birthday gift!"}'::jsonb,
  '[{"type":"medallion","icon":"🎂","title":"Birthday Badge","description":"You found the missing birthday gift!","value_label":"Birthday Badge","redemption_instructions":"Saved in Passport.","expiration_days":0}]'::jsonb,
  'Home',
  'Demo',
  'Demo'
)
on conflict (id) do update set
  title = excluded.title,
  story = excluded.story,
  status = excluded.status,
  adventure_scale = excluded.adventure_scale,
  experience_settings = excluded.experience_settings,
  estimated_minutes = excluded.estimated_minutes;

insert into public.clues (id, adventure_id, sort_order, title, text, latitude, longitude, radius_meters, clue_type)
values
  ('demo-1', 'demo-missing-birthday-gift', 0, 'The Swing Set', 'Look where you go up and down — check under the swing.', 37.34, -95.26, 100, 'text_riddle'),
  ('demo-2', 'demo-missing-birthday-gift', 1, 'The Flower Pot', 'Petals point the way — find the red flower pot.', 37.3402, -95.2598, 100, 'text_riddle'),
  ('demo-3', 'demo-missing-birthday-gift', 2, 'The Back Door', 'The gift waits where you wipe your shoes before going inside.', 37.3398, -95.2602, 100, 'text_riddle')
on conflict (id) do update set
  title = excluded.title,
  text = excluded.text,
  radius_meters = excluded.radius_meters;
