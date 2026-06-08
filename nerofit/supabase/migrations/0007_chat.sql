create table if not exists public.chat_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.chat_threads(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  embed      jsonb,
  created_at timestamptz not null default now()
);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

create policy "owner_chat_threads" on public.chat_threads
  for all using (auth.uid() = user_id);

create policy "owner_chat_messages" on public.chat_messages
  for all using (
    thread_id in (select id from public.chat_threads where user_id = auth.uid())
  );

create index if not exists chat_messages_thread_id_idx on public.chat_messages(thread_id, created_at);
