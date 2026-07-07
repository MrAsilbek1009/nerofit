-- 0018_membership_freeze.sql
-- Stage 3 polish: let staff/admin FREEZE a membership (pause the clock) so a
-- member who travels / is injured doesn't lose the days they paid for.
--
-- Freeze  → status='frozen', frozen_at=today (the clock stops; QR denies entry).
-- Unfreeze→ status='active', end_date += (today - frozen_at), frozen_at=null,
--           frozen_days_total += the days that were frozen (running audit/limit).
-- All writes stay server-side (admin-verify Edge Function, service role). Members
-- keep read-only access via the existing memberships_select_own policy, so no new
-- RLS is needed — the frozen row is simply visible to its owner.
--
-- 'frozen' already exists in the membership_status enum (see 0015).

alter table public.memberships
  add column if not exists frozen_at        date,
  add column if not exists frozen_days_total integer not null default 0;

comment on column public.memberships.frozen_at is
  'Date the current freeze started; null unless status = frozen.';
comment on column public.memberships.frozen_days_total is
  'Cumulative days this membership has been frozen (audit / future limits).';
