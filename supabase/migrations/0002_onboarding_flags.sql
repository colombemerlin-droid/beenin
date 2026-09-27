-- Been In — onboarding-progress flags.
-- Distinguishes a brand-new sign-in (needs to pick a handle, then run the
-- backfill/signup flow) from a returning user (skip straight to the app).
-- The 0001 trigger gives every new user a placeholder handle immediately,
-- so "handle is set" can't be inferred from the handle column alone.

alter table public.profiles
  add column handle_set boolean not null default false,
  add column onboarded boolean not null default false;
