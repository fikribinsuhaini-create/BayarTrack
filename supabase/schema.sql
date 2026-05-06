-- Single-user JSON state storage (simple + flexible).
-- Apply in Supabase SQL Editor.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
before update on public.app_state
for each row execute function public.set_updated_at();

create or replace function public.set_app_state_user_id()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    new.user_id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_app_state_user_id on public.app_state;
create trigger trg_app_state_user_id
before insert on public.app_state
for each row execute function public.set_app_state_user_id();

drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own"
on public.app_state for select
using (user_id = auth.uid());

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own"
on public.app_state for insert
with check (user_id = auth.uid());

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own"
on public.app_state for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

