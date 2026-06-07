-- 0006_nutrition.sql
-- Phase 4: nutrition (macros + meals + supplements).
-- Catalogs read-only to authenticated users; logs owner-only.

-- ---------- Enums ----------
do $$ begin
  create type public.meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meal_source as enum ('catalog', 'scan', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.day_part as enum ('morning', 'midday', 'evening');
exception when duplicate_object then null; end $$;

-- ---------- profiles: macro goals ----------
alter table public.profiles
  add column if not exists protein_goal_g integer not null default 200,
  add column if not exists carbs_goal_g   integer not null default 300,
  add column if not exists fats_goal_g    integer not null default 80;

-- ---------- meals (catalog) ----------
create table if not exists public.meals (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  kcal      integer not null default 0,
  protein_g integer not null default 0,
  carbs_g   integer not null default 0,
  fats_g    integer not null default 0,
  image_url text
);

alter table public.meals enable row level security;
create policy "meals_read" on public.meals
  for select using (auth.uid() is not null);

-- ---------- meal_logs (user-owned) ----------
create table if not exists public.meal_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  meal_id    uuid references public.meals(id) on delete set null,
  slot       public.meal_slot not null,
  log_date   date not null default current_date,
  -- denormalized for scan / manual entries
  name       text,
  kcal       integer,
  protein_g  integer,
  carbs_g    integer,
  fats_g     integer,
  source     public.meal_source not null default 'catalog',
  logged_at  timestamptz not null default now()
);

create index if not exists meal_logs_user_date_idx
  on public.meal_logs (user_id, log_date desc);

alter table public.meal_logs enable row level security;
create policy "meal_logs_select_own" on public.meal_logs
  for select using (auth.uid() = user_id);
create policy "meal_logs_insert_own" on public.meal_logs
  for insert with check (auth.uid() = user_id);
create policy "meal_logs_delete_own" on public.meal_logs
  for delete using (auth.uid() = user_id);

-- ---------- supplements (catalog) ----------
create table if not exists public.supplements (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  default_dose text,
  time_of_day  public.day_part not null default 'morning',
  order_index  integer not null default 0
);

alter table public.supplements enable row level security;
create policy "supplements_read" on public.supplements
  for select using (auth.uid() is not null);

-- ---------- supplement_logs (user-owned) ----------
create table if not exists public.supplement_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  taken         boolean not null default true,
  log_date      date not null default current_date,
  logged_at     timestamptz not null default now(),
  unique (user_id, supplement_id, log_date)
);

create index if not exists supplement_logs_user_date_idx
  on public.supplement_logs (user_id, log_date desc);

alter table public.supplement_logs enable row level security;
create policy "supplement_logs_select_own" on public.supplement_logs
  for select using (auth.uid() = user_id);
create policy "supplement_logs_insert_own" on public.supplement_logs
  for insert with check (auth.uid() = user_id);
create policy "supplement_logs_update_own" on public.supplement_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "supplement_logs_delete_own" on public.supplement_logs
  for delete using (auth.uid() = user_id);
