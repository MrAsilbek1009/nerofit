-- 0020_admin_security.sql
-- Admin panel security foundation (Admin Panel plan A0): session tokens + audit
-- log for the staff/admin web panels. Both tables are service-role-only (RLS
-- enabled with NO policies) — only the admin-verify Edge Function touches them.

-- ── Session tokens ───────────────────────────────────────────────────────
-- Login returns a random token; only its SHA-256 hash is stored here. Panels
-- send the token (not the password) on every request. Short-lived (12h).
create table if not exists public.admin_sessions (
  token_hash text primary key,
  staff_id   uuid references public.gym_staff(id) on delete cascade,  -- null = master/owner
  role       text not null,               -- owner | admin | staff
  name       text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen  timestamptz not null default now()
);
create index if not exists admin_sessions_expiry_idx on public.admin_sessions (expires_at);
alter table public.admin_sessions enable row level security;  -- no policies → locked

-- ── Audit log ────────────────────────────────────────────────────────────
-- Every mutating admin/staff action (and login attempts) is recorded here:
-- who did what, when, to whom. Used for accountability + brute-force rate limit.
create table if not exists public.admin_audit (
  id             bigint generated always as identity primary key,
  actor_role     text,
  actor_name     text,
  actor_staff_id uuid,
  action         text not null,           -- login | login_failed | activate | freeze | staff_add | ...
  target         text,                    -- user_id / staff_id / order id …
  meta           jsonb,                   -- { ip, plan_id, end_date, … }
  created_at     timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
create index if not exists admin_audit_action_idx on public.admin_audit (action, created_at desc);
alter table public.admin_audit enable row level security;  -- no policies → locked
