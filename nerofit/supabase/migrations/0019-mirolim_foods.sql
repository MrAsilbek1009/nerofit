-- 0019-mirolim_foods.sql
-- Phase 16 · N1 — regional food database (the "moat").
--
-- A searchable foods table: verified regional seed (Uzbek / Central Asian dishes
-- + local barcodes) plus user-submitted community foods. The app searches this
-- FIRST, then falls back to OpenFoodFacts — so palov/somsa/manti and local store
-- barcodes resolve where MyFitnessPal/Cal AI fail.
--
-- Naming: 0019 with the agreed `-mirolim` suffix to avoid colliding with the
-- collaborator's numbering (0015..0018 are taken).

do $$ begin
  create type public.food_source as enum ('seed', 'community', 'off');
exception when duplicate_object then null; end $$;

create table if not exists public.foods (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  brand         text,
  region        text,                 -- e.g. 'uz', 'central_asia'
  barcode       text,
  -- Macros describe ONE serving (see serving_label / serving_grams).
  kcal          integer not null default 0,
  protein_g     integer not null default 0,
  carbs_g       integer not null default 0,
  fats_g        integer not null default 0,
  serving_label text,                 -- e.g. '1 plate (300 g)'
  serving_grams integer,
  is_verified   boolean not null default false,
  source        public.food_source not null default 'community',
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists foods_barcode_idx on public.foods (barcode) where barcode is not null;
create index if not exists foods_name_lower_idx on public.foods (lower(name));
create index if not exists foods_verified_idx on public.foods (is_verified);

alter table public.foods enable row level security;

-- Read: verified foods are public to all authenticated users; a user also sees
-- their own (still-unverified) submissions. Keeping unverified community rows
-- private-until-verified is a deliberate quality/abuse guard — moderation
-- (service-role / admin) flips is_verified to publish them.
create policy "foods_select_visible" on public.foods
  for select to authenticated
  using (is_verified or created_by = auth.uid());

-- Insert: users may add community foods only, and can NOT self-verify.
create policy "foods_insert_own" on public.foods
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and is_verified = false
    and source = 'community'
  );

-- Update / delete: only your own, still-unverified rows (can't edit verified data
-- or flip is_verified — that's moderation's job via service-role).
create policy "foods_update_own" on public.foods
  for update to authenticated
  using (created_by = auth.uid() and not is_verified)
  with check (created_by = auth.uid() and is_verified = false);

create policy "foods_delete_own" on public.foods
  for delete to authenticated
  using (created_by = auth.uid() and not is_verified);

-- ---------------------------------------------------------------------------
-- Moderation (service-role / SQL editor only — RLS is bypassed there):
--   -- pending community foods to review:
--   select id, name, brand, kcal, created_by, created_at
--     from public.foods where source = 'community' and not is_verified
--     order by created_at;
--   -- publish one:
--   update public.foods set is_verified = true where id = '<uuid>';
-- A dedicated admin-verify panel (docs/gym-admin) lands in N1.1.
-- ---------------------------------------------------------------------------
