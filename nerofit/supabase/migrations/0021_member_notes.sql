-- 0021_member_notes.sql
-- Admin Panel plan A2 (members management): internal staff notes on a member.
-- These are PRIVATE to the gym staff — the member must never see them — so the
-- table is service-role-only (RLS enabled, NO policies). Only the admin-verify
-- Edge Function (service role) reads/writes them.

create table if not exists public.member_notes (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  author_staff_id uuid references public.gym_staff(id) on delete set null,  -- null = owner/master
  author_name     text,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists member_notes_user_idx
  on public.member_notes (user_id, created_at desc);

alter table public.member_notes enable row level security;  -- no policies → locked
