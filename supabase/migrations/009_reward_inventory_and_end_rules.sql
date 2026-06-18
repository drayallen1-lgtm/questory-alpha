-- Questory: Reward Inventory + Adventure End Rules

alter table public.adventures
  add column if not exists end_rule text not null default 'no_end_date',
  add column if not exists ends_at timestamptz,
  add column if not exists ends_after_total_completions integer,
  add column if not exists total_completions integer not null default 0,
  add column if not exists rewards_paused boolean not null default false,
  add column if not exists manually_ended boolean not null default false,
  add column if not exists reopened_at timestamptz;

alter table public.rewards
  add column if not exists quantity_limit integer,
  add column if not exists claimed_count integer not null default 0,
  add column if not exists reward_window_start timestamptz,
  add column if not exists reward_window_end timestamptz,
  add column if not exists reward_policy text not null default 'continue_badge_coins_only',
  add column if not exists rewards_paused boolean not null default false,
  add column if not exists backup_reward jsonb;

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  adventure_id text not null references public.adventures (id) on delete cascade,
  reward_id text not null references public.rewards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  claim_status text not null default 'claimed',
  created_at timestamptz not null default now(),
  unique (adventure_id, reward_id, user_id)
);

create index if not exists reward_claims_adventure_idx on public.reward_claims (adventure_id);
create index if not exists reward_claims_user_idx on public.reward_claims (user_id);

-- Atomic limited reward claim
create or replace function public.claim_limited_reward(
  p_adventure_id text,
  p_reward_id text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward public.rewards%rowtype;
  v_adventure public.adventures%rowtype;
  v_already boolean;
  v_new_count integer;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select exists(
    select 1 from public.reward_claims
    where adventure_id = p_adventure_id
      and reward_id = p_reward_id
      and user_id = p_user_id
  ) into v_already;

  if v_already then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  select * into v_adventure from public.adventures where id = p_adventure_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'adventure_not_found');
  end if;

  if coalesce(v_adventure.manually_ended, false) then
    return jsonb_build_object('ok', false, 'reason', 'adventure_ended');
  end if;

  if v_adventure.end_rule = 'ends_at' and v_adventure.ends_at is not null and now() >= v_adventure.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'adventure_ended');
  end if;

  if v_adventure.end_rule = 'ends_after_total_completions'
     and v_adventure.ends_after_total_completions is not null
     and coalesce(v_adventure.total_completions, 0) >= v_adventure.ends_after_total_completions then
    return jsonb_build_object('ok', false, 'reason', 'adventure_ended');
  end if;

  if coalesce(v_adventure.rewards_paused, false) then
    return jsonb_build_object('ok', false, 'reason', 'rewards_paused');
  end if;

  select * into v_reward
  from public.rewards
  where id = p_reward_id and adventure_id = p_adventure_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'reward_not_found');
  end if;

  if coalesce(v_reward.rewards_paused, false) then
    return jsonb_build_object('ok', false, 'reason', 'rewards_paused');
  end if;

  if v_reward.reward_window_start is not null and now() < v_reward.reward_window_start then
    return jsonb_build_object('ok', false, 'reason', 'outside_window');
  end if;

  if v_reward.reward_window_end is not null and now() > v_reward.reward_window_end then
    return jsonb_build_object('ok', false, 'reason', 'outside_window');
  end if;

  if v_reward.quantity_limit is not null and v_reward.claimed_count >= v_reward.quantity_limit then
    return jsonb_build_object(
      'ok', false,
      'reason', 'depleted',
      'policy', v_reward.reward_policy,
      'backup_reward', v_reward.backup_reward
    );
  end if;

  v_new_count := v_reward.claimed_count + 1;

  update public.rewards
  set claimed_count = v_new_count
  where id = p_reward_id;

  insert into public.reward_claims (adventure_id, reward_id, user_id)
  values (p_adventure_id, p_reward_id, p_user_id);

  update public.adventures
  set final_rewards = (
      select coalesce(jsonb_agg(
        case
          when (elem->>'id') = p_reward_id
          then jsonb_set(coalesce(elem, '{}'::jsonb), '{claimedCount}', to_jsonb(v_new_count), true)
          else elem
        end
      ), '[]'::jsonb)
      from jsonb_array_elements(coalesce(final_rewards, '[]'::jsonb)) elem
    )
  where id = p_adventure_id;

  return jsonb_build_object(
    'ok', true,
    'claimed_count', v_new_count,
    'remaining', case when v_reward.quantity_limit is null then null else v_reward.quantity_limit - v_new_count end
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
end;
$$;

grant execute on function public.claim_limited_reward(text, text, uuid) to authenticated;

alter table public.reward_claims enable row level security;

create policy "Users read own reward claims"
  on public.reward_claims for select
  using (auth.uid() = user_id);

create policy "Admins read all reward claims"
  on public.reward_claims for select
  using (public.is_admin());

-- Demo: limit Iron Horse coupon to first 2 (for testing)
update public.rewards
set
  quantity_limit = 2,
  reward_policy = 'replace_with_backup_reward',
  backup_reward = '{"title":"Completion Badge","desc":"25 coins + badge after rewards ran out.","coins":25,"badgeLabel":"Trail Finisher"}'::jsonb
where adventure_id = 'iron-horse' and type = 'coupon';

-- Ensure iron-horse coupon row exists with inventory (seed may add via upsert)
insert into public.rewards (
  id, adventure_id, sort_order, type, icon, title, description, value_label,
  redemption_instructions, expiration_days, quantity_limit, claimed_count, reward_policy, backup_reward
)
select
  'iron-horse-reward-1', 'iron-horse', 1, 'coupon', '🎟', 'Heritage Coffee Coupon',
  'First 2 finishers get a free drink', 'Free drink', 'Show in Vault at Main Street Roasters.', 7,
  2, 0, 'replace_with_backup_reward',
  '{"title":"Completion Badge","desc":"25 coins + badge","coins":25,"badgeLabel":"Trail Finisher"}'::jsonb
where exists (select 1 from public.adventures where id = 'iron-horse')
on conflict (id) do update set
  quantity_limit = 2,
  reward_policy = 'replace_with_backup_reward',
  backup_reward = excluded.backup_reward;

update public.adventures
set final_rewards = (
  select jsonb_agg(
    case
      when elem->>'type' = 'coupon'
      then elem
        || jsonb_build_object(
          'quantityLimit', 2,
          'claimedCount', coalesce((elem->>'claimedCount')::int, 0),
          'rewardPolicy', 'replace_with_backup_reward',
          'backupReward', jsonb_build_object(
            'title', 'Completion Badge',
            'desc', '25 coins + badge after rewards ran out.',
            'coins', 25,
            'badgeLabel', 'Trail Finisher'
          )
        )
      else elem
    end
  )
  from jsonb_array_elements(final_rewards) elem
)
where id = 'iron-horse' and final_rewards is not null and jsonb_array_length(final_rewards) > 0;
