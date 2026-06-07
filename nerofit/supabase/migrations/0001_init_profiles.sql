-- 0001_init_profiles.sql
-- Phase 1 foundation: create profiles table tied to auth.users, enable RLS,
-- and auto-seed a profile row on sign-up.

create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  name              text,
  avatar_url        text,
  focus             text,
  subscription_tier text not null default 'free',
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Read: owner only.
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Insert: owner only (also covered by trigger, but keeps client-side inserts safe).
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Update: owner only.
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
