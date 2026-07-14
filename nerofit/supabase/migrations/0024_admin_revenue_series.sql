-- 0024_admin_revenue_series.sql
-- Dashboard time-range revenue series (admin panel step 2): a period-bucketed
-- revenue series for the Daily / Weekly / Monthly chart toggle. Same locked-down
-- pattern as admin_dashboard_stats (SECURITY DEFINER, service-role only). Revenue
-- = sum of paid payments per bucket, UTC day boundaries (matches dashboard_stats).
--   period='day'   -> last 14 days   (label MM-DD)
--   period='week'  -> last 12 weeks  (ISO week start, label MM-DD)
--   period='month' -> last 12 months (label YYYY-MM)
-- Returns { d, v } points ascending — the exact shape the panel's bar chart reads.

create or replace function public.admin_revenue_series(period text default 'day')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with cfg as (
    select
      (now() at time zone 'UTC')::date as today,
      case when period = 'month' then 12 when period = 'week' then 12 else 14 end as n
  ),
  buckets as (
    select
      case
        when period = 'month' then (date_trunc('month', cfg.today::timestamp) - (i || ' months')::interval)::date
        when period = 'week'  then (date_trunc('week',  cfg.today::timestamp) - (i || ' weeks')::interval)::date
        else (cfg.today - i)
      end as b_start,
      case
        when period = 'month' then interval '1 month'
        when period = 'week'  then interval '1 week'
        else interval '1 day'
      end as b_len,
      case when period = 'month' then 'YYYY-MM' else 'MM-DD' end as fmt
    from cfg, generate_series(0, cfg.n - 1) i
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'd', to_char(b_start, fmt),
      'v', coalesce((
        select sum(p.amount_uzs) from public.payments p
        where p.status = 'paid'
          and p.paid_at >= b_start::timestamp at time zone 'UTC'
          and p.paid_at <  (b_start + b_len)::timestamp at time zone 'UTC'
      ), 0)
    ) order by b_start
  ), '[]'::jsonb)
  from buckets;
$$;

revoke all on function public.admin_revenue_series(text) from public, anon, authenticated;
grant execute on function public.admin_revenue_series(text) to service_role;
