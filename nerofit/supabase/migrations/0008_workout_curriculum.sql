-- 0008_workout_curriculum.sql
-- Phase 9 / W1: rich daily-curriculum model for the Workout track.
-- Non-destructive: existing programs/workouts/exercises tables are KEPT; this
-- adds curriculum metadata + new day-based tables alongside them.
-- Single-mode for now; programs.mode lets us add standard/high later WITHOUT a
-- migration (just new programs + program_days rows).

-- ---------- Enums ----------
do $$ begin
  create type public.exercise_category as enum
    ('push', 'pull', 'legs', 'core', 'cardio', 'warmup', 'mobility_stretch');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.equipment_tier as enum ('bodyweight', 'dumbbell_band', 'gym_full');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.program_section as enum ('warmup', 'main', 'cooldown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_type as enum ('education', 'workout', 'lifestyle', 'challenge');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.test_log_type as enum ('count', 'seconds', 'minutes');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.unit_system as enum ('metric', 'imperial');
exception when duplicate_object then null; end $$;

-- ---------- Exercises: rich library metadata ----------
alter table public.exercises
  add column if not exists code                 text,
  add column if not exists name_uz              text,
  add column if not exists category             public.exercise_category,
  add column if not exists equipment_tier       public.equipment_tier,
  add column if not exists progression_tier     integer,
  add column if not exists progression_group    text,
  add column if not exists injury_knee_safe     boolean not null default true,
  add column if not exists injury_back_safe     boolean not null default true,
  add column if not exists injury_shoulder_safe boolean not null default true,
  add column if not exists cues_uz              text,
  add column if not exists default_sets_reps    text;

create unique index if not exists exercises_code_key on public.exercises (code);

-- ---------- Programs: phase + mode (forward-compatible multi-mode) ----------
alter table public.programs
  add column if not exists phase integer not null default 1,
  add column if not exists mode  text    not null default 'standard';

-- ---------- Curriculum: one row per program day ----------
create table if not exists public.program_days (
  id                 uuid primary key default gen_random_uuid(),
  program_id         uuid not null references public.programs(id) on delete cascade,
  week_no            integer not null,
  day_no             integer not null,                 -- 1..7
  weekday            text,
  session_title      text not null,
  intro_video_script text,
  intro_video_url    text,
  is_rest_day        boolean not null default false,
  is_test_day        boolean not null default false,
  is_milestone_day   boolean not null default false,
  format             text    not null default 'standard',  -- standard | circuit
  rounds             integer,
  total_duration_min integer,
  order_index        integer not null default 0,
  unique (program_id, week_no, day_no)
);

create index if not exists program_days_program_idx
  on public.program_days (program_id, week_no, day_no);

-- Warmup / main / cooldown items inside a day.
create table if not exists public.program_day_exercises (
  id              uuid primary key default gen_random_uuid(),
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  section         public.program_section not null default 'main',
  order_index     integer not null default 0,
  exercise_id     uuid not null references public.exercises(id) on delete restrict,
  sets            integer,
  reps            text,                  -- "8" / "20 sek" / "8 har oyoq"
  rest_sec        integer,
  rest_after_sec  integer,               -- circuit pacing
  notes           text
);

create index if not exists program_day_exercises_day_idx
  on public.program_day_exercises (program_day_id, section, order_index);

-- Education / lifestyle / challenge tasks for a day.
create table if not exists public.program_day_tasks (
  id              uuid primary key default gen_random_uuid(),
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  order_index     integer not null default 0,
  type            public.task_type not null,
  title           text not null,
  duration_min    integer,
  target          text,
  optional        boolean not null default false,
  reward_xp       integer,
  linked_to       text,                  -- e.g. 'main_workout' | 'fitness_test'
  video_url       text
);

create index if not exists program_day_tasks_day_idx
  on public.program_day_tasks (program_day_id, order_index);

-- Fitness-test items (test days).
create table if not exists public.program_day_tests (
  id              uuid primary key default gen_random_uuid(),
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  order_index     integer not null default 0,
  test_key        text not null,
  name            text not null,
  exercise_id     uuid references public.exercises(id) on delete set null,
  instructions    text,
  log_type        public.test_log_type not null
);

create index if not exists program_day_tests_day_idx
  on public.program_day_tests (program_day_id, order_index);

-- ---------- Catalog RLS: any authenticated user may read; no client writes ----------
alter table public.program_days          enable row level security;
alter table public.program_day_exercises enable row level security;
alter table public.program_day_tasks     enable row level security;
alter table public.program_day_tests     enable row level security;

create policy "program_days_read"          on public.program_days          for select using (auth.uid() is not null);
create policy "program_day_exercises_read" on public.program_day_exercises for select using (auth.uid() is not null);
create policy "program_day_tasks_read"     on public.program_day_tasks     for select using (auth.uid() is not null);
create policy "program_day_tests_read"     on public.program_day_tests     for select using (auth.uid() is not null);

-- ---------- Profiles / goals: routing inputs ----------
alter table public.profiles
  add column if not exists preferred_unit_system public.unit_system not null default 'metric';

alter table public.goals
  add column if not exists experience_level   text,
  add column if not exists entry_point_week   integer not null default 1,
  add column if not exists training_frequency text not null default 'standard_3day';
