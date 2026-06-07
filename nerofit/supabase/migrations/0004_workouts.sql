-- 0004_workouts.sql
-- Phase 3: workouts catalog (read-only to authenticated users) + per-user
-- session/exercise logs (RLS owner-only).

-- ---------- Enums ----------
do $$ begin
  create type public.program_level as enum ('beginner', 'intermediate', 'elite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_status as enum ('active', 'completed', 'abandoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.log_status as enum ('done', 'skipped');
exception when duplicate_object then null; end $$;

-- ---------- Catalog ----------
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  level       public.program_level not null default 'intermediate',
  image_url   text,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.programs(id) on delete cascade,
  title       text not null,
  est_minutes integer,
  est_kcal    integer,
  image_url   text,
  order_index integer not null default 0
);

create index if not exists workouts_program_idx on public.workouts (program_id, order_index);

create table if not exists public.exercises (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  target_muscles text[] not null default '{}',
  default_sets   integer not null default 3,
  default_reps   integer not null default 10,
  image_url      text
);

create table if not exists public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  sets        integer not null default 3,
  reps        text not null default '10',          -- text: supports "failure", "45 sec"
  rest_sec    integer not null default 60,
  load_note   text,                                 -- e.g. "120 KG", "+10 KG"
  order_index integer not null default 0
);

create index if not exists workout_exercises_workout_idx
  on public.workout_exercises (workout_id, order_index);

create table if not exists public.exercise_videos (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  url         text not null,
  duration_sec integer,
  provider    text not null default 'storage'
);

create index if not exists exercise_videos_exercise_idx
  on public.exercise_videos (exercise_id);

-- Catalog RLS: any authenticated user may read; no writes from the client.
alter table public.programs enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.exercise_videos enable row level security;

create policy "programs_read"           on public.programs           for select using (auth.uid() is not null);
create policy "workouts_read"           on public.workouts           for select using (auth.uid() is not null);
create policy "exercises_read"          on public.exercises          for select using (auth.uid() is not null);
create policy "workout_exercises_read"  on public.workout_exercises  for select using (auth.uid() is not null);
create policy "exercise_videos_read"    on public.exercise_videos    for select using (auth.uid() is not null);

-- ---------- Logs (user-owned) ----------
create table if not exists public.workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workout_id   uuid not null references public.workouts(id) on delete cascade,
  status       public.session_status not null default 'active',
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists workout_sessions_user_idx
  on public.workout_sessions (user_id, status, started_at desc);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_select_own" on public.workout_sessions
  for select using (auth.uid() = user_id);
create policy "workout_sessions_insert_own" on public.workout_sessions
  for insert with check (auth.uid() = user_id);
create policy "workout_sessions_update_own" on public.workout_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.exercise_logs (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  status      public.log_status not null,
  sets_done   integer,
  reps_done   integer,
  weight_used numeric(6,2),
  logged_at   timestamptz not null default now(),
  unique (session_id, exercise_id)
);

create index if not exists exercise_logs_session_idx
  on public.exercise_logs (session_id);

alter table public.exercise_logs enable row level security;

-- Ownership is transitive through the parent session.
create policy "exercise_logs_select_own" on public.exercise_logs
  for select using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
create policy "exercise_logs_insert_own" on public.exercise_logs
  for insert with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
create policy "exercise_logs_update_own" on public.exercise_logs
  for update using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
