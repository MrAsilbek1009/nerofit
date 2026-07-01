-- 0015_gym_membership.sql
-- Gym membership (abonement): plans, per-user memberships, and payment history.
-- Physical service → no IAP; payments come from Payme/Click (Stage 2) or manual
-- admin activation (Stage 1). Members only READ their own rows; writes happen
-- server-side (Edge Function with service role) or by an admin.

-- ── Enums ────────────────────────────────────────────────────────────────
do $$ begin
  create type public.membership_status as enum
    ('pending', 'active', 'expired', 'frozen', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('created', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

-- ── Plans (tariffs) ──────────────────────────────────────────────────────
create table if not exists public.membership_plans (
  id            uuid primary key default gen_random_uuid(),
  name_uz       text    not null,
  duration_days integer not null,
  price_app_uzs integer not null,          -- in-app (discounted)
  price_gym_uzs integer not null,          -- at the gym (full)
  is_active     boolean not null default true,
  sort_order    integer not null default 0
);

alter table public.membership_plans enable row level security;

-- Anyone signed in can read the tariff list; no client writes (admin only).
create policy "plans_read_all" on public.membership_plans
  for select using (true);

-- ── Memberships (one row per purchase/period) ────────────────────────────
create table if not exists public.memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  plan_id    uuid not null references public.membership_plans(id),
  status     public.membership_status not null default 'pending',
  start_date date,
  end_date   date,
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_idx
  on public.memberships (user_id, status, end_date desc);

alter table public.memberships enable row level security;

-- Members read only their own memberships. Inserts/updates are server-side
-- (service role bypasses RLS) — manual admin activation or a payment webhook.
create policy "memberships_select_own" on public.memberships
  for select using (auth.uid() = user_id);

-- ── Payments (history + provider idempotency) ────────────────────────────
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  amount_uzs    integer not null,
  provider      text not null,             -- payme | click | manual
  provider_txn  text,                      -- provider transaction id (idempotency)
  status        public.payment_status not null default 'created',
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique (provider, provider_txn)
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- ── Seed tariffs (app-discounted vs gym-full prices) ─────────────────────
insert into public.membership_plans (name_uz, duration_days, price_app_uzs, price_gym_uzs, sort_order)
values
  ('1 oylik',  30,  250000,  350000, 1),
  ('3 oylik',  90,  750000, 1050000, 2),
  ('Yillik',  365, 1250000, 1500000, 3)
on conflict do nothing;
