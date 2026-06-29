-- Phase 13 (Home redesign) — configurable water serving size.
--
-- The Home water card's +/- buttons add/remove one "serving". Until now the
-- step was a hardcoded 250 ml; this lets each user set their own glass/bottle
-- size from the Water settings sheet (Cal AI parity). Nullable-safe via a
-- default so existing rows and the app keep working before any data exists.
--
-- Naming: 0011-mirolim (meal_micros) and 0012-mirolim (food_scans) are taken
-- (0011_custom_workouts.sql is the collaborator's), so this uses 0013 with the
-- agreed `-mirolim` suffix.

alter table public.profiles
  add column if not exists water_serving_ml integer not null default 250;
