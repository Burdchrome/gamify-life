-- Issue #16: backdating a task completed today is a correction, not a second
-- completion. The browser may move only the date column on its own completion
-- rows; the two-lock model still applies here, so the grant and RLS policy land
-- together instead of relying on either lock by itself.
grant update (completed_on) on table public.completions to authenticated;

create policy "Users can move dates on their own completions."
on public.completions for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  -- Defensive only: the column-scoped grant already forbids changing habit_id.
  and exists (
    select 1
    from public.habits
    where habits.id = habit_id
      and habits.user_id = (select auth.uid())
  )
);
