-- 0021-mirolim_adaptive_goals.sql
-- Phase 16 · N3 — adaptive nutrition targets (MacroFactor-style weekly history).
--
-- `nutrition_targets` is the audit trail of every weekly adaptive-goal
-- computation: the kcal/macro target that was set, the estimated TDEE that
-- produced it, and the smoothed weekly weight trend at compute time.
-- `profiles.protein_goal_g` / `carbs_goal_g` / `fats_goal_g` remain the LIVE
-- values the UI reads — this table only records how they got there, so the
-- adaptation engine can look back at prior targets and a future history
-- screen can chart them. `reason` distinguishes the onboarding baseline
-- ('initial') from weekly recomputes ('adaptive').
--
-- unique(user_id, effective_date) makes a same-day recompute an idempotent
-- upsert instead of a duplicate row.
--
-- Naming: 0021 with the agreed `-mirolim` suffix to avoid colliding with the
-- collaborator's numbering.
--
-- How to apply: run this file in the Supabase SQL editor (or `supabase db
-- push`). The table is intentionally NOT regenerated into src/types/db.ts —
-- the API layer (src/lib/api/nutritionTargets.ts) queries by string and
-- casts, same as userFoods.ts does for 0020.

-- ---------- nutrition_targets (user-owned adaptive-goal history) ----------
create table if not exists public.nutrition_targets (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  effective_date           date not null default current_date,
  kcal                     integer not null,
  protein_g                integer not null,
  carbs_g                  integer not null,
  fats_g                   integer not null,
  -- estimated expenditure that produced this target
  tdee_kcal                integer not null,
  -- smoothed weekly weight delta at compute time (kg; null when unknown)
  weight_trend_weekly_kg   numeric(5,2),
  -- 'adaptive' (weekly recompute) | 'initial' (onboarding baseline)
  reason                   text not null default 'adaptive',
  created_at               timestamptz not null default now(),
  unique (user_id, effective_date)
);

create index if not exists nutrition_targets_user_date_idx
  on public.nutrition_targets (user_id, effective_date desc);

alter table public.nutrition_targets enable row level security;
create policy "nutrition_targets_select_own" on public.nutrition_targets
  for select using (auth.uid() = user_id);
create policy "nutrition_targets_insert_own" on public.nutrition_targets
  for insert with check (auth.uid() = user_id);
create policy "nutrition_targets_update_own" on public.nutrition_targets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "nutrition_targets_delete_own" on public.nutrition_targets
  for delete using (auth.uid() = user_id);
