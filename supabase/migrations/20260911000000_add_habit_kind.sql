-- Issue #9 (+ the #13 taxonomy discussion): habits get a kind discriminator.
--   task   = done once, then cleared into the archive
--   daily  = repeats every day; the weekly number is an adjustable quota
--   weekly = genuinely N-times-per-week; rests once the target is met (#13)
-- Existing rows default to 'daily' (closest fit); Josh reclassifies his real
-- habits by hand after this lands.
-- Two-lock note: no grant or policy changes — the new column rides the table's
-- existing authenticated-only grants and per-user RLS policies unchanged.
alter table public.habits
  add column kind text not null default 'daily'
  constraint habits_kind_allowed check (kind in ('task', 'daily', 'weekly'));
