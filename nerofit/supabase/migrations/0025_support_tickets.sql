-- 0025_support_tickets.sql
-- Support inbox (admin panel step 3): member support tickets + a message thread.
-- Members read/create their OWN tickets (RLS) so the mobile app can submit later;
-- staff manage everything through the admin-verify Edge Function (service role,
-- which bypasses RLS). No cosmetic placeholders — this is a real, backed feature.

do $$ begin
  create type public.support_status as enum ('open', 'pending', 'resolved', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.support_priority as enum ('low', 'normal', 'high', 'urgent');
exception when duplicate_object then null; end $$;

-- ── Tickets ────────────────────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete set null,  -- member (null = walk-in logged by staff)
  subject          text not null,
  status           public.support_status not null default 'open',
  priority         public.support_priority not null default 'normal',
  created_by_staff uuid references public.gym_staff(id) on delete set null,  -- staff who logged it (if any)
  assigned_to      uuid references public.gym_staff(id) on delete set null,
  last_reply_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);

-- ── Message thread (member complaint + staff replies) ───────────────────────
create table if not exists public.support_ticket_messages (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.support_tickets(id) on delete cascade,
  author_kind     text not null,   -- 'member' | 'staff'
  author_staff_id uuid references public.gym_staff(id) on delete set null,
  author_name     text,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

-- Members read + create their OWN tickets (ready for the mobile app). Staff/admin
-- write via the service role, which bypasses these policies.
create policy "tickets_select_own" on public.support_tickets
  for select using (auth.uid() = user_id);
create policy "tickets_insert_own" on public.support_tickets
  for insert with check (auth.uid() = user_id);

-- Members read messages of their own tickets and post their own ('member') ones.
create policy "messages_select_own" on public.support_ticket_messages
  for select using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.user_id = auth.uid()));
create policy "messages_insert_own" on public.support_ticket_messages
  for insert with check (
    author_kind = 'member' and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()));
