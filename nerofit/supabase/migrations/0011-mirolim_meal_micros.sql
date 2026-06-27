-- Phase 13 Stage B (Home redesign) — micronutrients for the Health Score.
-- Adds fiber / sugar / sodium to logged meals and the meals catalog. All columns
-- are nullable so existing rows and the app keep working before any data exists
-- (the Health Score shows N/A until micros are populated, like Cal AI).
--
-- Naming: 0010 was taken by 0010_test_results.sql, so this uses 0011 with the
-- agreed `-mirolim` suffix to avoid colliding with the collaborator's numbering.

alter table public.meal_logs
  add column if not exists fiber_g   numeric,
  add column if not exists sugar_g   numeric,
  add column if not exists sodium_mg numeric;

alter table public.meals
  add column if not exists fiber_g   numeric,
  add column if not exists sugar_g   numeric,
  add column if not exists sodium_mg numeric;
