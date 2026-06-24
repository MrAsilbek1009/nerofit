-- 0009_workout_progress.sql
-- Phase 9 / W1: per-user progress for the day-based curriculum.
-- Reuses session_status / log_status enums from 0004. Owner-only RLS; logs and
-- task completions inherit ownership transitively through day_sessions.

-- One row per (user, program_day) attempt.
create table if not exists public.day_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  status          public.session_status not null default 'active',
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists day_sessions_user_idx
  on public.day_sessions (user_id, status, started_at desc);

alter table public.day_sessions enable row level security;

create policy "day_sessions_select_own" on public.day_sessions
  for select using (auth.uid() = user_id);
create policy "day_sessions_insert_own" on public.day_sessions
  for insert with check (auth.uid() = user_id);
create policy "day_sessions_update_own" on public.day_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-exercise log within a day session.
create table if not exists public.day_exercise_logs (
  id                       uuid primary key default gen_random_uuid(),
  day_session_id           uuid not null references public.day_sessions(id) on delete cascade,
  program_day_exercise_id  uuid not null references public.program_day_exercises(id) on delete cascade,
  status                   public.log_status not null,
  sets_done                integer,
  reps_done                integer,
  weight_used              numeric(6,2),
  logged_at                timestamptz not null default now(),
  unique (day_session_id, program_day_exercise_id)
);

create index if not exists day_exercise_logs_session_idx
  on public.day_exercise_logs (day_session_id);

alter table public.day_exercise_logs enable row level security;

create policy "day_exercise_logs_select_own" on public.day_exercise_logs
  for select using (
    exists (select 1 from public.day_sessions s
            where s.id = day_session_id and s.user_id = auth.uid())
  );
create policy "day_exercise_logs_insert_own" on public.day_exercise_logs
  for insert with check (
    exists (select 1 from public.day_sessions s
            where s.id = day_session_id and s.user_id = auth.uid())
  );
create policy "day_exercise_logs_update_own" on public.day_exercise_logs
  for update using (
    exists (select 1 from public.day_sessions s
            where s.id = day_session_id and s.user_id = auth.uid())
  );

-- Education / lifestyle / challenge task completions.
create table if not exists public.task_completions (
  id                   uuid primary key default gen_random_uuid(),
  day_session_id       uuid not null references public.day_sessions(id) on delete cascade,
  program_day_task_id  uuid not null references public.program_day_tasks(id) on delete cascade,
  completed_at         timestamptz not null default now(),
  unique (day_session_id, program_day_task_id)
);

create index if not exists task_completions_session_idx
  on public.task_completions (day_session_id);

alter table public.task_completions enable row level security;

create policy "task_completions_select_own" on public.task_completions
  for select using (
    exists (select 1 from public.day_sessions s
            where s.id = day_session_id and s.user_id = auth.uid())
  );
create policy "task_completions_insert_own" on public.task_completions
  for insert with check (
    exists (select 1 from public.day_sessions s
            where s.id = day_session_id and s.user_id = auth.uid())
  );
create policy "task_completions_delete_own" on public.task_completions
  for delete using (
    exists (select 1 from public.day_sessions s
            where s.id = day_session_id and s.user_id = auth.uid())
  );
