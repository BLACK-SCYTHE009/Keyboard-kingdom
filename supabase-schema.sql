-- Supabase schema for Keyboard Kingdom.
-- Run this in the Supabase SQL Editor for the project used by your .env keys.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id text primary key,
  username text not null unique,
  display_name text not null default '',
  age integer,
  gender text not null default 'other',
  bio text not null default '',
  profile_picture text not null default '',
  character text not null default 'heroA',
  avatar text not null default '1',
  level integer not null default 1,
  xp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  friend_id text not null references public.users(id) on delete cascade,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  constraint friends_user_friend_unique unique (user_id, friend_id),
  constraint friends_not_self check (user_id <> friend_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.users(id) on delete cascade,
  receiver_id text not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  lobby_id text not null,
  user_id text references public.users(id) on delete set null,
  level_id integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists users_username_idx on public.users (username);
create index if not exists users_character_idx on public.users (character);
create index if not exists users_level_idx on public.users (level desc);
create index if not exists users_xp_idx on public.users (xp desc);
create index if not exists friends_user_id_idx on public.friends (user_id);
create index if not exists friends_friend_id_idx on public.friends (friend_id);
create index if not exists direct_messages_sender_id_idx on public.direct_messages (sender_id);
create index if not exists direct_messages_receiver_id_idx on public.direct_messages (receiver_id);
create index if not exists game_sessions_lobby_id_idx on public.game_sessions (lobby_id);
create index if not exists game_sessions_user_id_idx on public.game_sessions (user_id);
create index if not exists game_sessions_created_at_idx on public.game_sessions (created_at desc);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
before update on public.users
for each row
execute function public.update_updated_at_column();

alter table public.users enable row level security;
alter table public.friends enable row level security;
alter table public.direct_messages enable row level security;
alter table public.game_sessions enable row level security;
