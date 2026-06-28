-- Phase 13 (food scan) — store the AI calorie-scan results.
--
-- Snap/pick a meal photo → the `food-analysis` Edge Function asks Claude to
-- estimate items + macros → the user edits and logs the total into `meal_logs`
-- (which already supports scan entries: name/kcal/macros + source='scan').
-- This table keeps a record of each raw scan so we can (a) rate-limit per user
-- without a separate counter and (b) revisit estimates later.
--
-- Naming: 0010 (test_results) and 0011-mirolim (meal_micros) are taken, so this
-- uses 0012 with the agreed `-mirolim` suffix to avoid colliding with the
-- collaborator's numbering.

-- ---------- food_scans (user-owned) ----------
create table if not exists public.food_scans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  -- reserved for a future `food-photos` storage bucket; null in v1.
  photo_path text,
  -- raw Claude estimate: { items[], total, confidence, notes }
  result     jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists food_scans_user_created_idx
  on public.food_scans (user_id, created_at desc);

alter table public.food_scans enable row level security;
create policy "food_scans_select_own" on public.food_scans
  for select using (auth.uid() = user_id);
create policy "food_scans_insert_own" on public.food_scans
  for insert with check (auth.uid() = user_id);
create policy "food_scans_delete_own" on public.food_scans
  for delete using (auth.uid() = user_id);
