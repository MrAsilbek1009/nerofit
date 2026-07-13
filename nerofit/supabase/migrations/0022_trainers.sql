-- 0022_trainers.sql
-- Admin Panel plan T1: gym trainer profiles + per-member assignment. Admin-only
-- management (NO member↔trainer chat). Trainers are read-only to authenticated
-- users so the app can show a member their assigned trainer; every write is
-- service-role (admin-verify Edge Function). Chain-ready: a `gym_id` column can
-- be added later without breaking these tables.

create table if not exists public.trainers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  specialization text,
  bio            text,
  photo_url      text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.trainers enable row level security;
-- Any signed-in user may read trainer profiles; no client writes (admin only).
create policy "trainers_read" on public.trainers
  for select using (auth.uid() is not null);

-- One assigned trainer per member (PK = user_id → reassigning replaces the row).
create table if not exists public.member_trainers (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  trainer_id  uuid not null references public.trainers(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

create index if not exists member_trainers_trainer_idx
  on public.member_trainers (trainer_id);

alter table public.member_trainers enable row level security;
-- A member reads only their own assignment (to show their trainer in-app);
-- inserts/updates/deletes are server-side (service role).
create policy "member_trainers_select_own" on public.member_trainers
  for select using (auth.uid() = user_id);
