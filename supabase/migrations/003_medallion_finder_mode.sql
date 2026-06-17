-- Medallion Finder Mode + claim method settings
-- Run after 002_adventure_creator_rls.sql

alter table public.adventures
  add column if not exists claim_method text not null default 'secret_code'
    check (claim_method in ('secret_code', 'tap_medallion', 'qr_code', 'hybrid')),
  add column if not exists qr_claim_value text,
  add column if not exists finder_search_radius_m integer not null default 200,
  add column if not exists finder_capture_base_m integer not null default 25;

update public.adventures
set
  claim_method = coalesce(claim_method, 'secret_code'),
  qr_claim_value = coalesce(qr_claim_value, claim_code)
where id = 'parsons-gold-rush';
