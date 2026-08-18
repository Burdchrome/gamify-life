-- Destructive on purpose: tears down the throwaway sandbox habits table and its
-- open-access policy (spec §Further Notes). No real data exists before this migration.
drop table if exists public.habits cascade;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null constraint habits_name_length check (char_length(btrim(name)) between 1 and 100),
  target_per_week int not null constraint habits_target_per_week_range check (target_per_week between 1 and 7),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index habits_user_id_idx on public.habits (user_id);

revoke all on table public.habits from anon, authenticated;
-- Delete is granted for e2e cleanup and RLS-scoped; the app UI archives instead.
grant select, insert, update, delete on table public.habits to authenticated;

alter table public.habits enable row level security;

create policy "Users can select their own habits."
on public.habits for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own habits."
on public.habits for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own habits."
on public.habits for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own habits."
on public.habits for delete
to authenticated
using ((select auth.uid()) = user_id);
