-- 0023_admin_analytics.sql
-- Admin dashboard analytics moved DB-side (Admin Panel perf work, Issue 2+3).
--
-- WHY: the Edge Function used to build the dashboard by downloading raw rows
-- from memberships / payments / gym_checkins and looping in Deno. PostgREST caps
-- each request at ~1000 rows, so a busy gym (>1000 check-ins in 14 days, or
-- >1000 paid payments in 30 days) silently UNDER-counted — a correctness bug,
-- not just a future scaling one. This function computes everything in one
-- indexed SQL round-trip and returns the SAME json shape the panel already reads.
--
-- Timezone parity with the old code: revenue uses UTC day boundaries; check-in
-- hours are bucketed to Asia/Tashkent local time (UTC+5, no DST) — identical
-- result to the old manual +5 arithmetic, just clearer. Behavior preserved 1:1.

-- ── Supporting indexes (Issue 3) ─────────────────────────────────────────
-- gym_checkins already has (checked_at desc) from 0017 — not repeated here.
-- Covering indexes: the include() column lets these queries run as Index-Only
-- Scans (no heap fetch). Kept as composite (not a partial WHERE status='paid')
-- so the finance journal (payments_list, arbitrary status filters) is served too.
create index if not exists payments_status_paid_idx
  on public.payments (status, paid_at desc) include (amount_uzs);
create index if not exists memberships_status_end_idx
  on public.memberships (status, end_date) include (user_id);

-- ── Dashboard stats RPC ──────────────────────────────────────────────────
-- SECURITY DEFINER + revoked from anon/authenticated: only the service-role
-- Edge Function may call it, matching the locked-down admin_* surface.
create or replace function public.admin_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with d as (select (now() at time zone 'UTC')::date as today)
  select jsonb_build_object(
    'active', (
      select count(distinct m.user_id) from public.memberships m, d
      where m.status = 'active' and m.end_date >= d.today),
    'expiring7', (
      select count(distinct m.user_id) from public.memberships m, d
      where m.status = 'active' and m.end_date >= d.today and m.end_date <= d.today + 7),
    'frozen', (
      select count(distinct m.user_id) from public.memberships m
      where m.status = 'frozen'),
    'checkinsToday', (
      select count(*) from public.gym_checkins c, d
      where c.checked_at >= d.today::timestamp at time zone 'UTC'),
    'salesToday', (
      select count(*) from public.payments p, d
      where p.status = 'paid' and p.paid_at >= d.today::timestamp at time zone 'UTC'),
    'revenueToday', (
      select coalesce(sum(p.amount_uzs), 0) from public.payments p, d
      where p.status = 'paid' and p.paid_at >= d.today::timestamp at time zone 'UTC'),
    'revenueWeek', (
      select coalesce(sum(p.amount_uzs), 0) from public.payments p, d
      where p.status = 'paid' and p.paid_at >= (d.today - 6)::timestamp at time zone 'UTC'),
    'revenueMonth', (
      select coalesce(sum(p.amount_uzs), 0) from public.payments p, d
      where p.status = 'paid' and p.paid_at >= (d.today - 29)::timestamp at time zone 'UTC'),
    'peakHour', (
      select h from (
        select extract(hour from timezone('Asia/Tashkent', c.checked_at))::int as h,
               count(*) as cnt
        from public.gym_checkins c, d
        where c.checked_at >= (d.today - 13)::timestamp at time zone 'UTC'
        group by 1 order by cnt desc, h asc limit 1
      ) t),
    'revDaily', (
      select coalesce(jsonb_agg(
               jsonb_build_object('d', to_char(day, 'MM-DD'), 'v', v) order by day
             ), '[]'::jsonb)
      from (
        select (d.today - gs) as day,
          coalesce((
            select sum(p.amount_uzs) from public.payments p
            where p.status = 'paid'
              and p.paid_at >= (d.today - gs)::timestamp at time zone 'UTC'
              and p.paid_at <  (d.today - gs + 1)::timestamp at time zone 'UTC'
          ), 0) as v
        from d, generate_series(0, 13) gs
      ) s),
    'checkinsByHour', (
      select coalesce(jsonb_agg(coalesce(c.cnt, 0) order by hr), '[]'::jsonb)
      from generate_series(0, 23) hr
      left join (
        select extract(hour from timezone('Asia/Tashkent', ck.checked_at))::int as h,
               count(*) as cnt
        from public.gym_checkins ck, d
        where ck.checked_at >= (d.today - 13)::timestamp at time zone 'UTC'
        group by 1
      ) c on c.h = hr)
  );
$$;

revoke all on function public.admin_dashboard_stats() from public, anon, authenticated;
grant execute on function public.admin_dashboard_stats() to service_role;
