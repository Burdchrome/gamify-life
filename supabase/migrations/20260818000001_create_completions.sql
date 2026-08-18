create table public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

create index completions_user_id_idx on public.completions (user_id);
create index completions_user_id_completed_on_idx on public.completions (user_id, completed_on);

revoke all on table public.completions from anon, authenticated;
grant select, insert, delete on table public.completions to authenticated;

alter table public.completions enable row level security;

create policy "Users can select their own completions."
on public.completions for select
to authenticated
using ((select auth.uid()) = user_id);

-- Ownership of the habit is checked too: without it, anyone knowing a habit's
-- uuid could squat (habit_id, completed_on) and block the owner via the unique constraint.
create policy "Users can insert completions for their own habits."
on public.completions for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.habits
    where habits.id = habit_id
      and habits.user_id = (select auth.uid())
  )
);

create policy "Users can delete their own completions."
on public.completions for delete
to authenticated
using ((select auth.uid()) = user_id);
