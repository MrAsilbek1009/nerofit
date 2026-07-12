-- 0020-mirolim_fast_log.sql
-- Phase 16 · N2 (part 2) — fast-log tables: favorites + saved meal combos.
--
-- Cal AI-style quick logging without re-searching or re-scanning:
--   * `favorite_foods` — single foods a user stars for one-tap re-logging.
--     `total_g` optionally carries the portion weight so the result editor's
--     gram slider can rescale. unique(user_id, name) lets "favorite" act as
--     an idempotent upsert.
--   * `user_meals` — saved combos (Cal AI's "Creating a meal"): a named set
--     of items (jsonb) with kcal/macro totals denormalized so lists render
--     without summing json on every row.
-- "Recents" need no new table — they're derived from `meal_logs` directly.
--
-- Naming: 0020 with the agreed `-mirolim` suffix to avoid colliding with the
-- collaborator's numbering (0015..0018 are taken; 0019 is foods).
--
-- How to apply: run this file in the Supabase SQL editor (or `supabase db
-- push`). Both tables are intentionally NOT regenerated into src/types/db.ts
-- — the API layer (src/lib/api/userFoods.ts) queries by string and casts,
-- same as foods.ts does for 0019.

-- ---------- favorite_foods (user-owned) ----------
create table if not exists public.favorite_foods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  kcal       integer not null,
  protein_g  integer not null default 0,
  carbs_g    integer not null default 0,
  fats_g     integer not null default 0,
  -- optional portion weight (grams) feeding the result editor's gram slider
  total_g    integer,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists favorite_foods_user_created_idx
  on public.favorite_foods (user_id, created_at desc);

alter table public.favorite_foods enable row level security;
create policy "favorite_foods_select_own" on public.favorite_foods
  for select using (auth.uid() = user_id);
create policy "favorite_foods_insert_own" on public.favorite_foods
  for insert with check (auth.uid() = user_id);
create policy "favorite_foods_update_own" on public.favorite_foods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorite_foods_delete_own" on public.favorite_foods
  for delete using (auth.uid() = user_id);

-- ---------- user_meals (user-owned saved combos) ----------
create table if not exists public.user_meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  -- totals denormalized from `items` at save time
  kcal       integer not null default 0,
  protein_g  integer not null default 0,
  carbs_g    integer not null default 0,
  fats_g     integer not null default 0,
  -- array of { name, kcal, protein_g, carbs_g, fats_g }
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_meals_user_created_idx
  on public.user_meals (user_id, created_at desc);

alter table public.user_meals enable row level security;
create policy "user_meals_select_own" on public.user_meals
  for select using (auth.uid() = user_id);
create policy "user_meals_insert_own" on public.user_meals
  for insert with check (auth.uid() = user_id);
create policy "user_meals_update_own" on public.user_meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_meals_delete_own" on public.user_meals
  for delete using (auth.uid() = user_id);
