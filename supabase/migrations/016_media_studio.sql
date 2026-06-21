-- Sweep 9.1 — Media Studio
-- Idempotent: media manifest on adventures + media_assets registry + storage bucket

alter table if exists public.adventures
  add column if not exists media_manifest jsonb not null default '[]'::jsonb;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  adventure_id uuid,
  type text not null default 'image',
  title text not null default '',
  storage_path text,
  public_url text not null default '',
  category text default 'upload',
  created_at timestamptz not null default now()
);

create index if not exists media_assets_owner_id_idx on public.media_assets (owner_id);
create index if not exists media_assets_adventure_id_idx on public.media_assets (adventure_id);

alter table public.media_assets enable row level security;

drop policy if exists "Media assets: read own or public" on public.media_assets;
create policy "Media assets: read own or public"
  on public.media_assets for select
  using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Media assets: insert own" on public.media_assets;
create policy "Media assets: insert own"
  on public.media_assets for insert
  with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Media assets: update own" on public.media_assets;
create policy "Media assets: update own"
  on public.media_assets for update
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Media assets: delete own" on public.media_assets;
create policy "Media assets: delete own"
  on public.media_assets for delete
  using (auth.uid() = owner_id or public.is_admin());

-- Storage bucket for creator media (public read for adventure playback)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'questory-media',
  'questory-media',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Questory media: public read" on storage.objects;
create policy "Questory media: public read"
  on storage.objects for select
  using (bucket_id = 'questory-media');

drop policy if exists "Questory media: owner upload" on storage.objects;
create policy "Questory media: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'questory-media'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

drop policy if exists "Questory media: owner update" on storage.objects;
create policy "Questory media: owner update"
  on storage.objects for update
  using (
    bucket_id = 'questory-media'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

drop policy if exists "Questory media: owner delete" on storage.objects;
create policy "Questory media: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'questory-media'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

comment on column public.adventures.media_manifest is 'Creator media studio asset manifest for this adventure';
comment on table public.media_assets is 'Uploaded and library media assets for AR scenes';
