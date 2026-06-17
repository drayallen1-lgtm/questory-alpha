-- Adventure creator ownership + RLS for cloud persistence
-- Run after 001_questory_alpha.sql

create index if not exists adventures_creator_id_idx on public.adventures (creator_id);
create index if not exists adventures_status_idx on public.adventures (status);

-- Adventures: creators manage their own rows; admins manage all
drop policy if exists "Adventures: admin insert" on public.adventures;
drop policy if exists "Adventures: admin update" on public.adventures;
drop policy if exists "Adventures: admin delete" on public.adventures;

create policy "Adventures: insert own or admin"
  on public.adventures for insert
  with check (public.is_admin() or auth.uid() = creator_id);

create policy "Adventures: update own or admin"
  on public.adventures for update
  using (public.is_admin() or auth.uid() = creator_id)
  with check (public.is_admin() or auth.uid() = creator_id);

create policy "Adventures: delete own or admin"
  on public.adventures for delete
  using (public.is_admin() or auth.uid() = creator_id);

-- Clues: follow adventure ownership
drop policy if exists "Clues: admin write" on public.clues;

create policy "Clues: write own adventure or admin"
  on public.clues for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.adventures a
      where a.id = clues.adventure_id and a.creator_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.adventures a
      where a.id = clues.adventure_id and a.creator_id = auth.uid()
    )
  );

-- Rewards templates: follow adventure ownership
drop policy if exists "Rewards: admin write" on public.rewards;

create policy "Rewards: write own adventure or admin"
  on public.rewards for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.adventures a
      where a.id = rewards.adventure_id and a.creator_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.adventures a
      where a.id = rewards.adventure_id and a.creator_id = auth.uid()
    )
  );
