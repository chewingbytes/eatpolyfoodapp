-- Migration: Create push_tokens table for Expo push notifications
create table if not exists public.push_tokens (
  id uuid not null default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  updated_at timestamp with time zone not null default now(),
  constraint push_tokens_pkey primary key (id),
  constraint push_tokens_user_id_key unique (user_id)
) tablespace pg_default;

-- RLS
alter table public.push_tokens enable row level security;

create policy "Users can manage their own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
