import Link from "next/link";
import { signOut } from "../actions/sign-out";
import { ArchivedHabitsSection } from "../components/manage/archived-habits-section";
import { ActiveHabitRow } from "../components/manage/active-habit-row";
import { CreateHabitForm } from "../components/manage/create-habit-form";
import { ManageEmptyState } from "../components/manage/manage-empty-state";
import { type ManageHabit } from "../components/manage/types";
import { requireUserId } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";

type HabitRow = {
  id: string;
  name: string;
  kind: "task" | "daily" | "weekly";
  target_per_week: number;
  is_archived: boolean;
  created_at: string;
};

export default async function ManagePage() {
  const userId = await requireUserId("manage");
  const supabase = await createClient();

  const { data: habitRows, error: habitsError } = await supabase
    .from("habits")
    .select("id, name, kind, target_per_week, is_archived, created_at")
    .eq("user_id", userId)
    .order("is_archived", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (habitsError) {
    console.error("Supabase manage habits fetch failed", {
      message: habitsError.message,
    });
  }

  const habits = ((habitRows ?? []) as HabitRow[]).map<ManageHabit>((habit) => ({
    id: habit.id,
    name: habit.name,
    kind: habit.kind,
    target_per_week: habit.target_per_week,
    is_archived: habit.is_archived,
  }));
  const activeHabits = habits.filter((habit) => !habit.is_archived);
  const archivedHabits = habits.filter((habit) => habit.is_archived);

  return (
    <main className="min-h-dvh bg-ground text-text-primary">
      <div className="scanline-overlay" aria-hidden="true" />
      <section className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 py-6 sm:px-6">
        <header className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-orbitron text-[11px] font-bold uppercase tracking-[4px] text-cyan">
                MANAGE://protocols
              </p>
              <h1 className="mt-2 font-rajdhani text-2xl font-bold uppercase tracking-[0.5px] text-text-primary">
                Protocol Loadout
              </h1>
            </div>
            <div className="shrink-0 text-right">
              <div className="flex items-center justify-end gap-2">
                <Link
                  className="inline-flex min-h-11 items-center rounded-[8px] border border-cyan-divider px-3 font-orbitron text-[9px] font-bold uppercase tracking-[2px] text-cyan transition hover:border-cyan"
                  href="/"
                >
                  TODAY
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

        <div className="h-px bg-cyan-divider" />

        {habitsError ? (
          <div className="flex flex-1 items-center justify-center py-16 text-center">
            <p className="font-rajdhani text-[13px] font-semibold uppercase tracking-[0.5px] text-error">
              PROTOCOL INDEX DEGRADED - HABITS UNAVAILABLE
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 py-5">
            <CreateHabitForm />
            {habits.length === 0 ? <ManageEmptyState /> : null}
            {activeHabits.length > 0 ? (
              <ul className="flex flex-col gap-2" aria-label="Active protocols">
                {activeHabits.map((habit) => (
                  <li key={habit.id}>
                    <ActiveHabitRow habit={habit} />
                  </li>
                ))}
              </ul>
            ) : null}
            <ArchivedHabitsSection habits={archivedHabits} />
          </div>
        )}
      </section>
    </main>
  );
}
