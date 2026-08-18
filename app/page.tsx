import { redirect } from "next/navigation";
import { TodayCompletions, type TodayHabit } from "./components/today-completions";
import { LocalDate } from "./components/local-date";
import { EmptyState, TodayError } from "./components/today-states";
import {
  countCompletionsThisWeek,
  getLocalDateIso,
  getWeekBounds,
} from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

type HabitRow = {
  id: string;
  name: string;
  target_per_week: number;
  completions: { completed_on: string }[] | null;
};

export default async function Home() {
  const supabase = await createClient();
  // Page-level re-check on top of proxy.ts: a misconfigured matcher would bypass the proxy silently (stack-research §2 "belt and braces")
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("Supabase home auth check failed", { message: error.message });
  }

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  if (!userId) {
    console.error("Supabase home auth check failed", {
      message: "Missing auth subject.",
    });
    redirect("/login");
  }

  const now = new Date();
  const today = getLocalDateIso(now);
  const weekBounds = getWeekBounds(now);
  const {
    data: habitRows,
    error: habitsError,
  } = await supabase
    .from("habits")
    .select("id, name, target_per_week, completions(completed_on)")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .gte("completions.completed_on", weekBounds.weekStart)
    .lte("completions.completed_on", weekBounds.weekEnd)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (habitsError) {
    console.error("Supabase habits fetch failed", { message: habitsError.message });
  }

  const habits = ((habitRows ?? []) as HabitRow[]).map<TodayHabit>((habit) => {
    const completedOnDates = (habit.completions ?? []).map(
      (completion) => completion.completed_on,
    );

    return {
      id: habit.id,
      name: habit.name,
      target_per_week: habit.target_per_week,
      isCompletedToday: completedOnDates.includes(today),
      weeklyCompletionCount: countCompletionsThisWeek(
        completedOnDates,
        weekBounds,
      ),
    };
  });
  const completedCount = habits.filter((habit) => habit.isCompletedToday).length;

  async function signOut() {
    "use server";

    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase sign-out failed", { message: error.message });
    }

    redirect("/login");
  }

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
              <form action={signOut} className="mt-3">
                <button
                  className="min-h-11 rounded-[8px] border border-cyan-divider px-3 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan transition hover:border-cyan disabled:text-text-muted"
                  type="submit"
                >
                  DISCONNECT
                </button>
              </form>
            </div>
          </div>
        </header>
        {habitsError ? (
          <>
            <div className="h-px bg-cyan-divider" />
            <TodayError />
          </>
        ) : habits.length > 0 ? (
          <TodayCompletions
            habits={habits}
            initialCompletedCount={completedCount}
          />
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
