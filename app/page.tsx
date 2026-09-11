import Link from "next/link";
import { signOut } from "./actions/sign-out";
import { TodayCompletions, type TodayHabit } from "./components/today-completions";
import { LocalDate } from "./components/local-date";
import { EmptyState, TodayError } from "./components/today-states";
import {
  getCompletionsFetchCeiling,
  getCompletionsFetchFloor,
} from "@/lib/dates";
import { requireUserId } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";

type HabitRow = {
  id: string;
  name: string;
  kind: "task" | "daily" | "weekly";
  target_per_week: number;
  completions: { completed_on: string }[] | null;
};

export default async function Home() {
  const userId = await requireUserId("home");
  const supabase = await createClient();

  // The server never interprets "today" — it can be a calendar day off the
  // device (issue #8). It ships a padded window of raw completion dates; the
  // client derives today/week with the device clock in today-completions.tsx.
  const {
    data: habitRows,
    error: habitsError,
  } = await supabase
    .from("habits")
    .select("id, name, kind, target_per_week, completions(completed_on)")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .gte("completions.completed_on", getCompletionsFetchFloor(new Date()))
    .lte("completions.completed_on", getCompletionsFetchCeiling(new Date()))
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (habitsError) {
    console.error("Supabase habits fetch failed", { message: habitsError.message });
  }

  const habits = ((habitRows ?? []) as HabitRow[]).map<TodayHabit>((habit) => ({
    id: habit.id,
    name: habit.name,
    kind: habit.kind,
    target_per_week: habit.target_per_week,
    completedOnDates: (habit.completions ?? []).map(
      (completion) => completion.completed_on,
    ),
  }));

  return (
    <main className="min-h-dvh bg-ground text-text-primary">
      <div className="scanline-overlay" aria-hidden="true" />
      <section className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-6 sm:px-6">
        <header className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-orbitron text-[11px] font-bold uppercase tracking-[4px] text-cyan">
                RUNNER://daily
              </p>
              <LocalDate />
            </div>
            <div className="shrink-0 text-right">
              <p className="font-orbitron text-xl font-bold leading-none text-yellow">
                --
              </p>
              <p className="mt-1 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-yellow/50">
                RANK
              </p>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Link
                  className="inline-flex min-h-11 items-center rounded-[8px] border border-cyan-divider px-3 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan transition hover:border-cyan"
                  href="/manage"
                >
                  MANAGE
                </Link>
                <form action={signOut}>
                  <button
                    className="min-h-11 rounded-[8px] border border-cyan-divider px-3 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan transition hover:border-cyan disabled:text-text-muted"
                    type="submit"
                  >
                    DISCONNECT
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>
        {habitsError ? (
          <>
            <div className="h-px bg-cyan-divider" />
            <TodayError />
          </>
        ) : habits.length > 0 ? (
          <TodayCompletions habits={habits} />
        ) : (
          <>
            <div className="h-px bg-cyan-divider" />
            <EmptyState />
          </>
        )}
      </section>
    </main>
  );
}
