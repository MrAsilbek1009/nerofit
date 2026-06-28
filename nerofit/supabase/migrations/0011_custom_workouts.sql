-- 0011_custom_workouts.sql
-- Custom workout generator: user-built sessions assembled from the exercise
-- library, separate from the day-based curriculum (they do NOT advance program
-- progression, but have their own history/stats). Owner-only RLS; the generated
-- exercises + their results live in one child table that inherits ownership
-- through custom_sessions. Reuses session_status / log_status enums (0004).

create table if not exists public.custom_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  params       jsonb not null default '{}'::jsonb,
  status       public.session_status not null default 'active',
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists custom_sessions_user_idx
  on public.custom_sessions (user_id, status, started_at desc);

alter table public.custom_sessions enable row level security;

drop policy if exists "custom_sessions_select_own" on public.custom_sessions;
create policy "custom_sessions_select_own" on public.custom_sessions
  for select using (auth.uid() = user_id);
drop policy if exists "custom_sessions_insert_own" on public.custom_sessions;
create policy "custom_sessions_insert_own" on public.custom_sessions
  for insert with check (auth.uid() = user_id);
drop policy if exists "custom_sessions_update_own" on public.custom_sessions;
create policy "custom_sessions_update_own" on public.custom_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "custom_sessions_delete_own" on public.custom_sessions;
create policy "custom_sessions_delete_own" on public.custom_sessions
  for delete using (auth.uid() = user_id);

-- The generated plan AND its results: one row per exercise. status is null until
-- the user logs it (then done/skipped + the performed sets/reps/weight).
create table if not exists public.custom_session_exercises (
  id                uuid primary key default gen_random_uuid(),
  custom_session_id uuid not null references public.custom_sessions(id) on delete cascade,
  exercise_id       uuid not null references public.exercises(id) on delete cascade,
  section           text not null check (section in ('warmup', 'main', 'cooldown')),
  order_index       integer not null,
  reps              text,
  sets              integer,
  rest_sec          integer,
  status            public.log_status,
  sets_done         integer,
  reps_done         integer,
  weight_used       numeric(6,2),
  logged_at         timestamptz
);

create index if not exists custom_session_exercises_session_idx
  on public.custom_session_exercises (custom_session_id, order_index);

alter table public.custom_session_exercises enable row level security;

drop policy if exists "custom_session_exercises_select_own" on public.custom_session_exercises;
create policy "custom_session_exercises_select_own" on public.custom_session_exercises
  for select using (
    exists (select 1 from public.custom_sessions s
            where s.id = custom_session_id and s.user_id = auth.uid())
  );
drop policy if exists "custom_session_exercises_insert_own" on public.custom_session_exercises;
create policy "custom_session_exercises_insert_own" on public.custom_session_exercises
  for insert with check (
    exists (select 1 from public.custom_sessions s
            where s.id = custom_session_id and s.user_id = auth.uid())
  );
drop policy if exists "custom_session_exercises_update_own" on public.custom_session_exercises;
create policy "custom_session_exercises_update_own" on public.custom_session_exercises
  for update using (
    exists (select 1 from public.custom_sessions s
            where s.id = custom_session_id and s.user_id = auth.uid())
  );
