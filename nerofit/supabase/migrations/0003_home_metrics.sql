-- 0003_home_metrics.sql
-- Phase 2: data for the Home dashboard.
-- Adds health_metrics + water_logs (both user-owned, both RLS).

do $$ begin
  create type public.health_metric_type as enum (
    'heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'steps'
  );
exception when duplicate_object then null; end $$;

-- ---------- health_metrics ----------
create table if not exists public.health_metrics (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  type        public.health_metric_type not null,
  value       numeric(8,2) not null,
  recorded_at timestamptz not null default now()
);

create index if not exists health_metrics_user_type_recorded_idx
  on public.health_metrics (user_id, type, recorded_at desc);

alter table public.health_metrics enable row level security;

create policy "health_metrics_select_own" on public.health_metrics
  for select using (auth.uid() = user_id);
create policy "health_metrics_insert_own" on public.health_metrics
  for insert with check (auth.uid() = user_id);

-- ---------- water_logs ----------
create table if not exists public.water_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  amount_ml  integer     not null check (amount_ml > 0),
  logged_at  timestamptz not null default now()
);

create index if not exists water_logs_user_logged_idx
  on public.water_logs (user_id, logged_at desc);

alter table public.water_logs enable row level security;

create policy "water_logs_select_own" on public.water_logs
  for select using (auth.uid() = user_id);
create policy "water_logs_insert_own" on public.water_logs
  for insert with check (auth.uid() = user_id);
create policy "water_logs_delete_own" on public.water_logs
  for delete using (auth.uid() = user_id);
