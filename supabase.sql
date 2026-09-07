-- Run this once in Supabase SQL Editor.
create table if not exists public.frostlink_messages (
  id text primary key,
  created_at timestamptz not null default now(),
  message jsonb not null
);

create index if not exists frostlink_messages_created_at_idx
  on public.frostlink_messages (created_at);

-- The Node backend uses the Supabase service-role key, so client RLS is not used.
-- Do NOT put the service-role key in the browser or Vercel frontend.


create table if not exists public.frostlink_accounts (
  email text primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);
