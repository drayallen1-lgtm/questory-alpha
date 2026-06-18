-- Questory Sweep #1: The Hook — collections, founder hunts, badges, engagement

alter table public.adventures
  add column if not exists collection_id text,
  add column if not exists collection_name text,
  add column if not exists collection_badge text,
  add column if not exists collection_reward_coins integer not null default 0,
  add column if not exists collection_reward_medallion text,
  add column if not exists collection_ids text[] default '{}',
  add column if not exists is_founder_hunt boolean not null default false,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists region text default 'Kansas',
  add column if not exists estimated_minutes integer not null default 25,
  add column if not exists miles_estimate numeric(6,2) default 0.8,
  add column if not exists players_completed integer not null default 0,
  add column if not exists first_finder_name text;

alter table public.profiles
  add column if not exists badges jsonb not null default '[]'::jsonb,
  add column if not exists streak jsonb not null default '{"count":0,"lastLoginDate":null}'::jsonb,
  add column if not exists miles_walked numeric(8,2) not null default 0,
  add column if not exists adventures_completed integer not null default 0,
  add column if not exists founder_hunts_completed integer not null default 0,
  add column if not exists collections_completed jsonb not null default '[]'::jsonb,
  add column if not exists first_finder_adventures jsonb not null default '[]'::jsonb,
  add column if not exists completed_collection_rewards jsonb not null default '[]'::jsonb;

update public.adventures
set
  title = 'The Hidden Ledger',
  collection_id = 'parsons-legends',
  collection_name = 'Parsons Legends',
  collection_badge = 'Keeper of Parsons Badge',
  collection_reward_coins = 500,
  collection_reward_medallion = 'Parsons Legends Exclusive Medallion',
  city = 'Parsons',
  state = 'Kansas',
  region = 'Kansas',
  estimated_minutes = 25,
  miles_estimate = 0.8,
  players_completed = 38,
  first_finder_name = 'Sarah J.'
where id = 'parsons-gold-rush';

insert into public.adventures (
  id, title, location, story, sponsor_name, distance, prize, status, difficulty,
  claim_code, claim_method, qr_claim_value, reward_coins, pot_entries,
  finder_search_radius_m, finder_capture_base_m, final_rewards,
  collection_id, collection_name, collection_badge, collection_reward_coins,
  collection_reward_medallion, city, state, region, estimated_minutes, miles_estimate,
  players_completed, first_finder_name, is_founder_hunt
) values
(
  'iron-horse', 'The Iron Horse', 'Parsons, Kansas',
  'Follow the iron rails to the old switching yard.',
  'Parsons Heritage Trail', '0.6 mi', 'Iron Horse Medallion', 'published', 2,
  'IRONHORSE', 'tap_medallion', 'IRONHORSE', 50, 3, 200, 25,
  '[{"type":"medallion","icon":"🚂","title":"Iron Horse Medallion","desc":"Virtual medallion from The Iron Horse trail","valueLabel":"Collection Piece","redemptionInstructions":"Saved in your Questory Passport.","expirationDays":0}]'::jsonb,
  'parsons-legends', 'Parsons Legends', 'Keeper of Parsons Badge', 500,
  'Parsons Legends Exclusive Medallion', 'Parsons', 'Kansas', 'Kansas', 20, 0.6, 24, 'Marcus T.', false
),
(
  'river-sentinel', 'River Sentinel', 'Parsons, Kansas',
  'A stone sentinel once guarded the Neosho crossing.',
  'Neosho River Council', '1.1 mi', 'River Sentinel Medallion', 'published', 3,
  'SENTINEL', 'hybrid', 'SENTINEL', 50, 4, 200, 25,
  '[{"type":"medallion","icon":"🌊","title":"River Sentinel Medallion","desc":"Virtual medallion from River Sentinel","valueLabel":"Collection Piece","redemptionInstructions":"Saved in your Questory Passport.","expirationDays":0}]'::jsonb,
  'parsons-legends', 'Parsons Legends', 'Keeper of Parsons Badge', 500,
  'Parsons Legends Exclusive Medallion', 'Parsons', 'Kansas', 'Kansas', 30, 1.1, 19, 'Elena R.', false
),
(
  'union-depot-ghost', 'Union Depot Ghost', 'Parsons, Kansas',
  'Whispers say a conductor still walks the depot platform at dusk.',
  'Parsons Heritage Trail', '0.7 mi', 'Depot Ghost Medallion', 'published', 3,
  'DEPOTGHOST', 'secret_code', 'DEPOTGHOST', 50, 3, 200, 25,
  '[{"type":"medallion","icon":"👻","title":"Depot Ghost Medallion","desc":"Virtual medallion from Union Depot Ghost","valueLabel":"Collection Piece","redemptionInstructions":"Saved in your Questory Passport.","expirationDays":0}]'::jsonb,
  'parsons-legends', 'Parsons Legends', 'Keeper of Parsons Badge', 500,
  'Parsons Legends Exclusive Medallion', 'Parsons', 'Kansas', 'Kansas', 22, 0.7, 31, 'Jake M.', false
),
(
  'founders-parsons-lost', 'Founder''s Hunt: What Was Lost', 'Parsons, Kansas',
  'The original Questory founder hid a legendary medallion before the trail went cold.',
  'QUESTORY Founders', '1.4 mi', '10,000 Coins + Lifetime Premium', 'published', 5,
  'FOUNDLOST', 'tap_medallion', 'FOUNDLOST', 10000, 10, 200, 25,
  '[{"type":"medallion","icon":"👑","title":"Found What Was Lost","desc":"Founder''s Hunt legendary medallion","valueLabel":"Lifetime Premium","redemptionInstructions":"Premium status recorded in your Passport forever.","expirationDays":0}]'::jsonb,
  null, null, null, 0, null, 'Parsons', 'Kansas', 'Kansas', 45, 1.4, 3, 'Sarah J.', true
)
on conflict (id) do nothing;

insert into public.clues (id, adventure_id, sort_order, title, text, latitude, longitude, radius_meters) values
('ih-1', 'iron-horse', 0, 'Switchyard Gate', 'Stand where the freight cars once lined up beside the water tower.', 37.338, -95.258, 500),
('ih-2', 'iron-horse', 1, 'Engine Marker', 'Find the plaque honoring Engine 47.', 37.3372, -95.2565, 500),
('rs-1', 'river-sentinel', 0, 'River Bend', 'Where the Neosho bends east, count the limestone steps.', 37.334, -95.252, 500),
('rs-2', 'river-sentinel', 1, 'Sentinel Post', 'The rusted post still points toward the old ferry landing.', 37.3335, -95.251, 500),
('rs-3', 'river-sentinel', 2, 'Stone Watch', 'The sentinel stone bears a weathered star.', 37.3328, -95.2495, 500),
('ud-1', 'union-depot-ghost', 0, 'Platform Echo', 'Count the benches on the north platform.', 37.3395, -95.2605, 500),
('ud-2', 'union-depot-ghost', 1, 'Clock Tower', 'Find the year the depot was restored.', 37.3398, -95.2612, 500),
('fh-1', 'founders-parsons-lost', 0, 'Founder Stone', 'Where the founder first stood to read the town map.', 37.341, -95.262, 500),
('fh-2', 'founders-parsons-lost', 1, 'Lost Ledger', 'A brass plate marks where the ledger was buried.', 37.3402, -95.259, 500)
on conflict (id) do nothing;
