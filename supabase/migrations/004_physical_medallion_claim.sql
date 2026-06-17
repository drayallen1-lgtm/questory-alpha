-- Final Treasure Claim System: physical medallion method
-- Run after 003_medallion_finder_mode.sql

alter table public.adventures
  add column if not exists physical_medallion_code text,
  add column if not exists hint_after_tap text;

alter table public.adventures drop constraint if exists adventures_claim_method_check;

alter table public.adventures
  add constraint adventures_claim_method_check
  check (
    claim_method in (
      'secret_code',
      'tap_medallion',
      'qr_code',
      'hybrid',
      'physical_medallion'
    )
  );
