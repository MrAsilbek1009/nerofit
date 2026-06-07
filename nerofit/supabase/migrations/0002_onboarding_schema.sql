-- 0002_onboarding_schema.sql
-- Phase 2: capture onboarding answers.
-- Extends profiles, adds goals + body_metrics with RLS.

-- ---------- Enums ----------
do $$ begin
  create type public.biological_sex as enum ('male', 'female', 'non_binary');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.goal_focus as enum ('lose_fat', 'build_muscle', 'stay_fit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_level as enum (
    'sedentary', 'lightly_active', 'moderately_active', 'very_active'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.equipment_access as enum ('no_equipment', 'home_gym', 'full_gym');
exception when duplicate_object then null; end $$;

-- ---------- profiles (extend) ----------
alter table public.profiles
  add column if not exists sex            public.biological_sex,
  add column if not exists date_of_birth  date,
  add column if not exists daily_water_goal_ml integer not null default 8000,
  add column if not exists onboarded_at   timestamptz;

-- ---------- goals ----------
create table if not exists public.goals (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  focus          public.goal_focus      not null,
  activity_level public.activity_level  not null,
  equipment      public.equipment_access not null,
  injuries       text[]                 not null default '{}',
  notes          text,
  target_weight  numeric(5,2),
  created_at     timestamptz            not null default now(),
  updated_at     timestamptz            not null default now()
);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- body_metrics (time series) ----------
create table if not exists public.body_metrics (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  recorded_at  timestamptz not null default now(),
  weight_kg    numeric(5,2),
  height_cm    numeric(5,2),
  body_fat_pct numeric(4,2)
);

create index if not exists body_metrics_user_recorded_idx
  on public.body_metrics (user_id, recorded_at desc);

alter table public.body_metrics enable row level security;

create policy "body_metrics_select_own" on public.body_metrics
  for select using (auth.uid() = user_id);
create policy "body_metrics_insert_own" on public.body_metrics
  for insert with check (auth.uid() = user_id);
create policy "body_metrics_update_own" on public.body_metrics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- updated_at trigger for goals ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
  before update on public.goals
  for each row execute function public.touch_updated_at();
