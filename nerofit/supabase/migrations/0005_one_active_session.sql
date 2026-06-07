-- 0005_one_active_session.sql
-- Phase 3 fix: prevent empty / duplicate active workout sessions.

-- 1) Mavjud bo'sh active sessiyalar (logsiz) → abandoned.
update public.workout_sessions s
set status = 'abandoned'
where s.status = 'active'
  and not exists (
    select 1 from public.exercise_logs l where l.session_id = s.id
  );

-- 2) Bitta user+workout uchun bir nechta active qolsa, eng yangisini qoldirib
--    qolganlarini abandoned qil.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, workout_id
           order by started_at desc
         ) as rn
  from public.workout_sessions
  where status = 'active'
)
update public.workout_sessions s
set status = 'abandoned'
from ranked r
where s.id = r.id and r.rn > 1;

-- 3) Har user+workout uchun faqat bitta active sessiya kafolati.
create unique index if not exists workout_sessions_one_active
  on public.workout_sessions (user_id, workout_id)
  where status = 'active';
