-- 0017_gym_staff.sql
-- Stage 3+: gym staff accounts + attendance log + manual-activation attribution.
--
-- The admin panel authenticates staff by password only (each staff has a unique
-- password). Passwords are stored hashed (SHA-256 with the service-role key as a
-- pepper, computed in the admin-verify Edge Function) — never in plaintext, never
-- in git. Both tables are service-role-only (RLS on, no policies) — the app never
-- touches them; only the Edge Function (service role) does.

-- Staff / admin accounts.
create table if not exists public.gym_staff (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  -- SHA-256 hex of (service_role_key + ":" + password). Unique so a password maps
  -- to exactly one staff (login is by password alone).
  password_hash text not null unique,
  role          text not null default 'staff' check (role in ('staff', 'admin')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Attendance: one row per door check (staff verifies a member's QR).
create table if not exists public.gym_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  staff_id   uuid references public.gym_staff(id) on delete set null,
  was_active boolean not null,
  checked_at timestamptz not null default now()
);
create index if not exists gym_checkins_user_idx on public.gym_checkins (user_id, checked_at desc);
create index if not exists gym_checkins_time_idx on public.gym_checkins (checked_at desc);

-- Who activated a manual (cash) payment, for the admin report.
alter table public.payments
  add column if not exists activated_by uuid references public.gym_staff(id) on delete set null;

-- Lock both new tables down to the service role only (Edge Function).
alter table public.gym_staff   enable row level security;
alter table public.gym_checkins enable row level security;
-- No policies on purpose: authenticated/anon get nothing; service_role bypasses RLS.
