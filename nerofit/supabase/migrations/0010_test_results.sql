-- 0010_test_results.sql
-- Phase 9 / W6 (part 2): user-entered fitness-test results (test days).
-- Owner-only RLS. One latest result per (user, test) — upsert on that key.

create table if not exists public.test_results (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  program_day_test_id  uuid not null references public.program_day_tests(id) on delete cascade,
  value                numeric not null,
  recorded_at          timestamptz not null default now(),
  unique (user_id, program_day_test_id)
);

create index if not exists test_results_user_idx
  on public.test_results (user_id);

alter table public.test_results enable row level security;

create policy "test_results_select_own" on public.test_results
  for select using (auth.uid() = user_id);
create policy "test_results_insert_own" on public.test_results
  for insert with check (auth.uid() = user_id);
create policy "test_results_update_own" on public.test_results
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
